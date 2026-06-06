package com.newsservice.service;

import com.newsservice.dto.*;
import com.newsservice.exceptions.NotFoundException;
import com.newsservice.model.NewsArticle;
import com.newsservice.model.NewsArticleInstrument;
import com.newsservice.repository.NewsArticleRepository;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.client.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.concurrent.atomic.AtomicBoolean;

/**
 * Service component that handles news rss operations.
 */
@Service
public class NewsRssService {

    private final Logger logger = LogManager.getLogger(NewsRssService.class);
    private final RestClient restClient;
    private final NewsArticleRepository newsArticleRepository;
    private final AtomicBoolean fetchRunning = new AtomicBoolean(false);
    @Value("${news.api.yahoo.url}")
    private String yahooRssBaseUrl;

    @Value("${news.api.sozcu.base.url}")
    private String sozcuRssBaseUrl;

    @Value("${model.service.api.url}")
    private String modelServiceApiUrl;

    /**
     * Creates a new NewsRssService with its required dependencies.
     *
     * @param restClient rest client value
     * @param newsArticleRepository news article repository value
     */
    public NewsRssService(RestClient restClient, NewsArticleRepository newsArticleRepository) {
        this.restClient = restClient;
        this.newsArticleRepository = newsArticleRepository;
    }

    /**
     * Fetches news.
     */
    @Scheduled(fixedRate = 600000)
    public void fetchNews() {
        if (!fetchRunning.compareAndSet(false, true)) {
            logger.info("RSS fetch already running, skipping. thread={}", threadInfo());
            return;
        }

        logger.info("RSS fetch started. thread={}", threadInfo());
        long startedAt = System.currentTimeMillis();
        try {
            getRssSources().forEach(this::fetchFromSource);
        } finally {
            fetchRunning.set(false);
            logger.info("RSS fetch finished. durationMs={}, thread={}",
                    System.currentTimeMillis() - startedAt, threadInfo());
        }
    }

    /**
     * Performs refresh.
     */
    public void refresh() {
        fetchNews();
    }

    /**
     * Returns rss sources.
     *
     * @return rss sources result
     */
    private List<RssSource> getRssSources() {
        return List.of(
                new RssSource("Yahoo RSS", NewsCountry.US, NewsTopic.STOCK, yahooRssBaseUrl),

                new RssSource("Sozcu RSS", NewsCountry.TR, NewsTopic.COMMODITY, sozcuRssBaseUrl + "/feeds-rss-category-emtia"),
                new RssSource("Sozcu RSS", NewsCountry.TR, NewsTopic.GENERAL, sozcuRssBaseUrl + "/feeds-rss-category-finans"),
                new RssSource("Sozcu RSS", NewsCountry.TR, NewsTopic.STOCK, sozcuRssBaseUrl + "/feeds-rss-category-borsa"),
                new RssSource("Sozcu RSS", NewsCountry.TR, NewsTopic.CRYPTO, sozcuRssBaseUrl + "/feeds-rss-category-kripto")
        );
    }

    /**
     * Fetches from source.
     *
     * @param source source value
     */
    private void fetchFromSource(RssSource source) {
        long startedAt = System.currentTimeMillis();
        try {
            logger.info("RSS source fetch started. source={}, topic={}, country={}, url={}, thread={}",
                    source.name(), source.topic(), source.country(), source.url(), threadInfo());

            List<NewsItem> items = source.country().equals(NewsCountry.US)
                    ? fetchYahooItems(source)
                    : fetchSozcuItems(source);

            SaveSummary summary = saveItems(source, items);
            logger.info(
                    "RSS source fetch completed. source={}, topic={}, country={}, fetched={}, saved={}, updated={}, skipped={}, classificationNull={}, durationMs={}, thread={}",
                    source.name(),
                    source.topic(),
                    source.country(),
                    items.size(),
                    summary.saved(),
                    summary.updated(),
                    summary.skipped(),
                    summary.classificationNull(),
                    System.currentTimeMillis() - startedAt,
                    threadInfo());
        } catch (Exception e) {
            logger.error("RSS source fetch failed. source={}, url={}", source.name(), source.url(), e);
        }
    }
    /**
     * Fetches yahoo items.
     *
     * @param source source value
     * @return fetch yahoo items result
     */
    private List<NewsItem> fetchYahooItems(RssSource source) {
        try {
            YahooRssFilteredResponse response = restClient.get()
                    .uri(source.url())
                    .header("User-Agent", "Finance-Portal RSS Reader")
                    .accept(MediaType.APPLICATION_XML, MediaType.TEXT_XML, MediaType.ALL)
                    .retrieve()
                    .body(YahooRssFilteredResponse.class);

            if (response == null || response.channel() == null || response.channel().items() == null) {
                logger.warn("Yahoo RSS response empty. url={}", source.url());
                return List.of();
            }

            return response.channel().items();

        } catch (HttpClientErrorException e) {
            logger.error("Client error fetching Yahoo RSS. url={}, status={}, body={}",
                    source.url(), e.getStatusCode(), e.getResponseBodyAsString());
            return List.of();

        } catch (HttpServerErrorException e) {
            logger.error("Server error fetching Yahoo RSS. url={}, status={}",
                    source.url(), e.getStatusCode());
            return List.of();

        } catch (ResourceAccessException e) {
            logger.error("Connection error fetching Yahoo RSS. url={}, cause={}",
                    source.url(), e.getMessage());
            return List.of();

        } catch (RestClientException e) {
            logger.error("Unexpected error fetching Yahoo RSS. url={}", source.url(), e);
            return List.of();
        }
    }

    /**
     * Fetches sozcu items.
     *
     * @param source source value
     * @return fetch sozcu items result
     */
    private List<NewsItem> fetchSozcuItems(RssSource source) {
        SozcuRssResponse response = restClient.get()
                .uri(source.url())
                .header("User-Agent", "Finance-Portal RSS Reader")
                .accept(MediaType.APPLICATION_XML, MediaType.TEXT_XML, MediaType.ALL)
                .retrieve()
                .body(SozcuRssResponse.class);

        if (response == null || response.channel() == null || response.channel().items() == null) {
            logger.warn("Sozcu RSS response empty. url={}", source.url());
            return List.of();
        }

        return response.channel().items();
    }

    /**
     * Saves items.
     *
     * @param source source value
     * @param items items value
     * @return save items result
     */
    private SaveSummary saveItems(RssSource source, List<NewsItem> items) {
        SaveSummary summary = new SaveSummary();
        for (NewsItem item : items) {
            SaveResult result = saveItem(source, item);
            summary.record(result);
        }
        return summary;
    }

    /**
     * Saves item.
     *
     * @param source source value
     * @param item item value
     * @return save item result
     */
    public SaveResult saveItem(RssSource source, NewsItem item) {
        if (item == null || isBlank(item.link()) || isBlank(item.title())) {
            logger.debug("RSS item skipped because mandatory fields are missing. source={}, thread={}",
                    source.name(), threadInfo());
            return SaveResult.SKIPPED;
        }

        String url = item.link().trim();
        String title = stripHtml(safe(item.title()));
        String description = stripHtml(safe(item.description()));
        String fullText = buildFullText(title, description);

        ClassificationResponse classification = classifyNews(fullText);
        if (classification == null) {
            logger.warn("RSS item classification returned null. source={}, title={}, url={}, thread={}",
                    source.name(), title, url, threadInfo());
        }

        var existingArticle = newsArticleRepository.findByUrl(url);
        if (existingArticle.isPresent()) {
            NewsArticle article = existingArticle.get();

            if (classification != null && shouldUpdateClassification(article, classification)) {
                article.setInstrumentSymbol(classification.instrumentSymbol());
                article.setModelName("classification-api");
                article.setTopic(resolveTopic(classification, article.getTopic()));
                replaceArticleInstruments(article, classification);
                newsArticleRepository.save(article);
                logger.info("RSS item classification updated. source={}, topic={}, symbol={}, title={}, url={}, thread={}",
                        source.name(), article.getTopic(), article.getInstrumentSymbol(), title, url, threadInfo());
                return SaveResult.UPDATED;
            }

            return classification == null ? SaveResult.CLASSIFICATION_NULL : SaveResult.SKIPPED;
        }

        NewsArticle newsArticle = NewsArticle.builder()
                .sourceName(source.name())
                .authorName("unknown")
                .country(source.country())
                .topic(resolveTopic(classification, source.topic()))
                .title(title)
                .description(description)
                .content(description)
                .url(url)
                .urlToImage(resolveImageUrl(item))
                .instrumentSymbol(classification != null ? classification.instrumentSymbol() : null)
                .modelName(classification != null ? "classification-api" : null)
                .publishedDate(parseRssDate(item.pubDate()))
                .build();
        replaceArticleInstruments(newsArticle, classification);

        newsArticleRepository.save(newsArticle);
        logger.info("RSS item saved. source={}, topic={}, symbol={}, title={}, url={}, thread={}",
                source.name(),
                newsArticle.getTopic(),
                newsArticle.getInstrumentSymbol(),
                title,
                url,
                threadInfo());
        return classification == null ? SaveResult.CLASSIFICATION_NULL : SaveResult.SAVED;
    }

    /**
     * Returns the result of should update classification.
     *
     * @param article article value
     * @param classification classification value
     * @return true when should update classification succeeds or matches its condition
     */
    private boolean shouldUpdateClassification(NewsArticle article, ClassificationResponse classification) {
        return article.getModelName() == null
                || !same(article.getInstrumentSymbol(), classification.instrumentSymbol())
                || article.getInstruments() == null
                || article.getInstruments().isEmpty();
    }

    /**
     * Returns the result of same.
     *
     * @param left left value
     * @param right right value
     * @return true when same succeeds or matches its condition
     */
    private boolean same(String left, String right) {
        if (left == null) {
            return right == null;
        }
        return left.equals(right);
    }


    /**
     * Returns the result of classify news.
     *
     * @param fullText full text value
     * @return classify news result
     */
    private ClassificationResponse classifyNews(String fullText) {
        if (isBlank(fullText)) {
            return null;
        }

        long startedAt = System.currentTimeMillis();
        try {
            ClassificationResponse response = restClient.post()
                    .uri(modelServiceApiUrl)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(Map.of("headline", fullText))
                    .retrieve()
                    .body(ClassificationResponse.class);
            logger.debug("Classification completed. assetType={}, symbol={}, unknown={}, durationMs={}, text={}, thread={}",
                    response != null ? response.assetType() : null,
                    response != null ? response.symbol() : null,
                    response != null && response.unknown(),
                    System.currentTimeMillis() - startedAt,
                    fullText,
                    threadInfo());
            return response;
        } catch (Exception e) {
            logger.warn("Classification failed for text={}", fullText, e);
            return null;
        }

    }

    /**
     * Returns the result of resolve topic.
     *
     * @param classification classification value
     * @param fallback fallback value
     * @return resolve topic result
     */
    private NewsTopic resolveTopic(ClassificationResponse classification, NewsTopic fallback) {
        if (classification == null || classification.assetType() == null || classification.assetType().isBlank()) {
            return fallback;
        }

        return switch (classification.assetType()) {
            case "STOCK", "INDEX", "VIOP" -> NewsTopic.STOCK;
            case "CRYPTO" -> NewsTopic.CRYPTO;
            case "FOREX" -> NewsTopic.FOREX;
            case "COMMODITY" -> NewsTopic.COMMODITY;
            case "BOND" -> NewsTopic.BOND;
            case "FUND" -> NewsTopic.FUND;
            default -> fallback;
        };
    }

    /**
     * Returns all articles after date.
     *
     * @param date date value
     * @return all articles after date result
     */
    public List<FilteredArticleDto> getAllArticlesAfterDate(LocalDate date) {
        return newsArticleRepository.findByIsApprovedTrueAndPublishedDateAfter(date.atStartOfDay())
                .stream()
                .map(this::toDto)
                .toList();
    }

    /**
     * Returns articles by topic after date.
     *
     * @param topic topic value
     * @param date date value
     * @return articles by topic after date result
     */
    public List<FilteredArticleDto> getArticlesByTopicAfterDate(NewsTopic topic, LocalDate date) {
        return newsArticleRepository.findByTopicAndIsApprovedTrueAndPublishedDateAfter(topic, date.atStartOfDay())
                .stream()
                .map(this::toDto)
                .toList();
    }

    /**
     * Returns articles by country after date.
     *
     * @param country country value
     * @param date date value
     * @return articles by country after date result
     */
    public List<FilteredArticleDto> getArticlesByCountryAfterDate(NewsCountry country, LocalDate date) {
        return newsArticleRepository.findByCountryAndIsApprovedTrueAndPublishedDateAfter(country, date.atStartOfDay())
                .stream()
                .map(this::toDto)
                .toList();
    }

    /**
     * Returns articles by topic and country after date.
     *
     * @param topic topic value
     * @param country country value
     * @param date date value
     * @return articles by topic and country after date result
     */
    public List<FilteredArticleDto> getArticlesByTopicAndCountryAfterDate(
            NewsTopic topic,
            NewsCountry country,
            LocalDate date
    ) {
        return newsArticleRepository.findByTopicAndCountryAndIsApprovedTrueAndPublishedDateAfter(topic, country, date.atStartOfDay())
                .stream()
                .map(this::toDto)
                .toList();
    }

    /**
     * Returns pending articles.
     *
     * @return pending articles result
     */
    public List<FilteredArticleDto> getPendingArticles() {
        return newsArticleRepository.findByIsApprovedFalseOrderByPublishedDateDesc()
                .stream()
                .map(this::toDto)
                .toList();
    }

    /**
     * Updates approval.
     *
     * @param id identifier of the target resource
     * @param approved approved value
     * @return update approval result
     */
    public FilteredArticleDto updateApproval(UUID id, boolean approved) {
        NewsArticle article = newsArticleRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("News article not found"));
        article.setApproved(approved);
        return toDto(newsArticleRepository.save(article));
    }

    /**
     * Deletes article.
     *
     * @param id identifier of the target resource
     */
    public void deleteArticle(UUID id) {
        if (!newsArticleRepository.existsById(id)) {
            throw new NotFoundException("News article not found");
        }
        newsArticleRepository.deleteById(id);
    }

    /**
     * Converts data to dto.
     *
     * @param entity entity value
     * @return to dto result
     */
    private FilteredArticleDto toDto(NewsArticle entity) {
        return new FilteredArticleDto(
                new Source(entity.getId() != null ? entity.getId().toString() : null, entity.getSourceName()),
                entity.getAuthorName(),
                entity.getTitle(),
                entity.getCountry() != null ? entity.getCountry().name() : null,
                entity.getTopic() != null ? entity.getTopic().name() : null,
                entity.getDescription(),
                entity.getContent(),
                entity.getUrl(),
                entity.getUrlToImage(),
                entity.getPublishedDate() != null ? entity.getPublishedDate().toString() : null,
                entity.getModelName(),
                entity.getInstrumentSymbol(),
                entity.isApproved(),
                toInstrumentDtos(entity)
        );
    }

    /**
     * Converts data to instrument dtos.
     *
     * @param entity entity value
     * @return to instrument dtos result
     */
    private List<NewsInstrumentDto> toInstrumentDtos(NewsArticle entity) {
        if (entity.getInstruments() == null || entity.getInstruments().isEmpty()) {
            return List.of();
        }

        return entity.getInstruments().stream()
                .sorted(Comparator.comparingInt(NewsArticleInstrument::getRankOrder))
                .map(instrument -> new NewsInstrumentDto(
                        instrument.getSymbol(),
                        instrument.getAssetType(),
                        instrument.getScore(),
                        instrument.getRankOrder(),
                        instrument.isPrimaryMatch(),
                        instrument.getMatchSource()))
                .toList();
    }

    /**
     * Performs replace article instruments.
     *
     * @param article article value
     * @param classification classification value
     */
    private void replaceArticleInstruments(NewsArticle article, ClassificationResponse classification) {
        if (article.getInstruments() == null) {
            article.setInstruments(new ArrayList<>());
        }

        article.getInstruments().clear();
        if (classification == null) {
            return;
        }

        List<NewsArticleInstrument> instruments = buildArticleInstruments(article, classification);
        article.getInstruments().addAll(instruments);
    }

    /**
     * Returns the result of build article instruments.
     *
     * @param article article value
     * @param classification classification value
     * @return build article instruments result
     */
    private List<NewsArticleInstrument> buildArticleInstruments(
            NewsArticle article,
            ClassificationResponse classification) {

        List<NewsArticleInstrument> instruments = new ArrayList<>();
        Set<String> seenSymbols = new LinkedHashSet<>();
        int rank = 1;

        String primarySymbol = classification.instrumentSymbol();
        if (!isBlank(primarySymbol)) {
            instruments.add(toArticleInstrument(
                    article,
                    primarySymbol,
                    classification.assetType(),
                    classification.symbolScore(),
                    rank++,
                    true,
                    classification.lexiconSymbol() != null ? "LEXICON" : "MODEL"));
            seenSymbols.add(primarySymbol);
        }

        if (classification.topCandidates() == null) {
            return instruments;
        }

        for (String candidate : classification.topCandidates()) {
            CandidateInstrument candidateInstrument = parseCandidate(candidate);
            if (candidateInstrument == null || isBlank(candidateInstrument.symbol())) {
                continue;
            }
            if ("UNKNOWN".equals(candidateInstrument.symbol()) || seenSymbols.contains(candidateInstrument.symbol())) {
                continue;
            }

            instruments.add(toArticleInstrument(
                    article,
                    candidateInstrument.symbol(),
                    classification.assetType(),
                    candidateInstrument.score(),
                    rank++,
                    false,
                    "CANDIDATE"));
            seenSymbols.add(candidateInstrument.symbol());
        }

        return instruments;
    }

    /**
     * Converts data to article instrument.
     *
     * @param article article value
     * @param symbol instrument symbol used to locate market data
     * @param assetType asset type value
     * @param score score value
     * @param rank rank value
     * @param primaryMatch primary match value
     * @param matchSource match source value
     * @return to article instrument result
     */
    private NewsArticleInstrument toArticleInstrument(
            NewsArticle article,
            String symbol,
            String assetType,
            String score,
            int rank,
            boolean primaryMatch,
            String matchSource) {

        return NewsArticleInstrument.builder()
                .newsArticle(article)
                .symbol(symbol)
                .assetType(assetType)
                .score(score)
                .rankOrder(rank)
                .primaryMatch(primaryMatch)
                .matchSource(matchSource)
                .build();
    }

    /**
     * Returns the result of parse candidate.
     *
     * @param candidate candidate value
     * @return parse candidate result
     */
    private CandidateInstrument parseCandidate(String candidate) {
        if (candidate == null || candidate.isBlank()) {
            return null;
        }

        String value = candidate.trim();
        int scoreStart = value.lastIndexOf('(');
        int scoreEnd = value.lastIndexOf(')');
        if (scoreStart > 0 && scoreEnd > scoreStart) {
            String symbol = value.substring(0, scoreStart).trim();
            String score = value.substring(scoreStart + 1, scoreEnd).trim();
            return new CandidateInstrument(symbol, score);
        }

        return new CandidateInstrument(value, null);
    }

    /**
     * Returns the result of build full text.
     *
     * @param title title value
     * @param description description value
     * @return build full text result
     */
    private String buildFullText(String title, String description) {
        return (stripHtml(safe(title)) + " " + stripHtml(safe(description))).trim();
    }

    /**
     * Returns the result of resolve image url.
     *
     * @param item item value
     * @return resolve image url result
     */
    private String resolveImageUrl(NewsItem item) {
        if (item.mediaContent() == null || isBlank(item.mediaContent().url())) {
            return null;
        }
        return item.mediaContent().url().trim();
    }

    /**
     * Returns the result of parse rss date.
     *
     * @param value value value
     * @return parse rss date result
     */
    private LocalDateTime parseRssDate(String value) {
        if (isBlank(value)) {
            return LocalDateTime.now();
        }

        String date = value.trim();

        try {
            return ZonedDateTime.parse(date, DateTimeFormatter.RFC_1123_DATE_TIME).toLocalDateTime();
        } catch (Exception ignored) {
        }

        try {
            return OffsetDateTime.parse(date).toLocalDateTime();
        } catch (Exception ignored) {
        }

        try {
            return LocalDateTime.parse(date);
        } catch (Exception ignored) {
        }

        logger.warn("RSS date parse failed. value={}", value);
        return LocalDateTime.now();
    }

    /**
     * Returns the result of strip html.
     *
     * @param value value value
     * @return strip html result
     */
    private String stripHtml(String value) {
        return value
                .replaceAll("<[^>]*>", " ")
                .replace("&nbsp;", " ")
                .replace("&amp;", "&")
                .replace("&quot;", "\"")
                .replace("&#39;", "'")
                .replaceAll("\\s+", " ")
                .trim();
    }

    /**
     * Returns the result of safe.
     *
     * @param value value value
     * @return safe result
     */
    private String safe(String value) {
        return value == null ? "" : value.trim();
    }

    /**
     * Indicates whether blank.
     *
     * @param value value value
     * @return true when is blank succeeds or matches its condition
     */
    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    /**
     * Data transfer object that carries candidate instrument data.
     */
    private record CandidateInstrument(String symbol, String score) {
    }

    /**
     * Returns the result of thread info.
     *
     * @return thread info result
     */
    private String threadInfo() {
        Thread thread = Thread.currentThread();
        return thread.getName() + "(virtual=" + thread.isVirtual() + ")";
    }

    /**
     * Enumeration of supported save result values.
     */
    public enum SaveResult {
        SAVED,
        UPDATED,
        SKIPPED,
        CLASSIFICATION_NULL
    }

    /**
     * Class that provides save summary behavior.
     */
    private static class SaveSummary {
        private int saved;
        private int updated;
        private int skipped;
        private int classificationNull;

        void record(SaveResult result) {
            switch (result) {
                case SAVED -> saved++;
                case UPDATED -> updated++;
                case SKIPPED -> skipped++;
                case CLASSIFICATION_NULL -> classificationNull++;
            }
        }

        int saved() {
            return saved;
        }

        int updated() {
            return updated;
        }

        int skipped() {
            return skipped;
        }

        int classificationNull() {
            return classificationNull;
        }
    }
}
