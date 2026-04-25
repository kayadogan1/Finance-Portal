package com.newsservice.service;

import com.newsservice.dto.*;
import com.newsservice.model.NewsArticle;
import com.newsservice.model.NewsArticleInstrument;
import com.newsservice.repository.NewsArticleRepository;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.concurrent.atomic.AtomicBoolean;

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

    public NewsRssService(RestClient restClient, NewsArticleRepository newsArticleRepository) {
        this.restClient = restClient;
        this.newsArticleRepository = newsArticleRepository;
    }

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

    public void refresh() {
        fetchNews();
    }

    private List<RssSource> getRssSources() {
        return List.of(
                new RssSource("Yahoo RSS", NewsCountry.US, NewsTopic.STOCK, yahooRssBaseUrl),

                new RssSource("Sozcu RSS", NewsCountry.TR, NewsTopic.COMMODITY, sozcuRssBaseUrl + "/feeds-rss-category-emtia"),
                new RssSource("Sozcu RSS", NewsCountry.TR, NewsTopic.GENERAL, sozcuRssBaseUrl + "/feeds-rss-category-finans"),
                new RssSource("Sozcu RSS", NewsCountry.TR, NewsTopic.STOCK, sozcuRssBaseUrl + "/feeds-rss-category-borsa"),
                new RssSource("Sozcu RSS", NewsCountry.TR, NewsTopic.CRYPTO, sozcuRssBaseUrl + "/feeds-rss-category-kripto")
        );
    }

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

    private List<NewsItem> fetchYahooItems(RssSource source) {
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
    }

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

    private SaveSummary saveItems(RssSource source, List<NewsItem> items) {
        SaveSummary summary = new SaveSummary();
        for (NewsItem item : items) {
            SaveResult result = saveItem(source, item);
            summary.record(result);
        }
        return summary;
    }

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

    private boolean shouldUpdateClassification(NewsArticle article, ClassificationResponse classification) {
        return article.getModelName() == null
                || !same(article.getInstrumentSymbol(), classification.instrumentSymbol())
                || article.getInstruments() == null
                || article.getInstruments().isEmpty();
    }

    private boolean same(String left, String right) {
        if (left == null) {
            return right == null;
        }
        return left.equals(right);
    }


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

    public List<FilteredArticleDto> getAllArticlesAfterDate(LocalDate date) {
        return newsArticleRepository.findByPublishedDateAfter(date.atStartOfDay())
                .stream()
                .map(this::toDto)
                .toList();
    }

    public List<FilteredArticleDto> getArticlesByTopicAfterDate(NewsTopic topic, LocalDate date) {
        return newsArticleRepository.findByTopicAndPublishedDateAfter(topic, date.atStartOfDay())
                .stream()
                .map(this::toDto)
                .toList();
    }

    public List<FilteredArticleDto> getArticlesByCountryAfterDate(NewsCountry country, LocalDate date) {
        return newsArticleRepository.findByCountryAndPublishedDateAfter(country, date.atStartOfDay())
                .stream()
                .map(this::toDto)
                .toList();
    }

    public List<FilteredArticleDto> getArticlesByTopicAndCountryAfterDate(
            NewsTopic topic,
            NewsCountry country,
            LocalDate date
    ) {
        return newsArticleRepository.findByTopicAndCountryAndPublishedDateAfter(topic, country, date.atStartOfDay())
                .stream()
                .map(this::toDto)
                .toList();
    }

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
                toInstrumentDtos(entity)
        );
    }

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

    private String buildFullText(String title, String description) {
        return (stripHtml(safe(title)) + " " + stripHtml(safe(description))).trim();
    }

    private String resolveImageUrl(NewsItem item) {
        if (item.mediaContent() == null || isBlank(item.mediaContent().url())) {
            return null;
        }
        return item.mediaContent().url().trim();
    }

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

    private String safe(String value) {
        return value == null ? "" : value.trim();
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    private record CandidateInstrument(String symbol, String score) {
    }

    private String threadInfo() {
        Thread thread = Thread.currentThread();
        return thread.getName() + "(virtual=" + thread.isVirtual() + ")";
    }

    public enum SaveResult {
        SAVED,
        UPDATED,
        SKIPPED,
        CLASSIFICATION_NULL
    }

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
