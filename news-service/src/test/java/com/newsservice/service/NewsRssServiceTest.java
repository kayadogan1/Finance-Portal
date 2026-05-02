package com.newsservice.service;

import com.newsservice.dto.*;
import com.newsservice.model.NewsArticle;
import com.newsservice.model.NewsArticleInstrument;
import com.newsservice.repository.NewsArticleRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.client.RestClient;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.atomic.AtomicBoolean;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.content;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withServerError;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;
import static org.springframework.http.HttpMethod.GET;
import static org.springframework.http.HttpMethod.POST;

@ExtendWith(MockitoExtension.class)
class NewsRssServiceTest {

    @Mock
    private NewsArticleRepository newsArticleRepository;

    private NewsRssService newsRssService;

    @BeforeEach
    void setUp() {
        newsRssService = new NewsRssService(RestClient.create(), newsArticleRepository);
        ReflectionTestUtils.setField(newsRssService, "yahooRssBaseUrl", "http://localhost/unused-yahoo");
        ReflectionTestUtils.setField(newsRssService, "sozcuRssBaseUrl", "http://localhost/unused-sozcu");
        ReflectionTestUtils.setField(newsRssService, "modelServiceApiUrl", "http://localhost/unused-classify");
    }

    @AfterEach
    void tearDown() {
        clearInvocations(newsArticleRepository);
    }

    @Test
    void saveItem_whenMandatoryFieldsMissing_returnsSkipped() {
        NewsItem item = new NewsItem("desc", "   ", "Wed, 01 May 2026 12:00:00 GMT", null, null);
        RssSource source = new RssSource("Yahoo RSS", NewsCountry.US, NewsTopic.STOCK, "http://unused");

        NewsRssService.SaveResult result = newsRssService.saveItem(source, item);

        assertEquals(NewsRssService.SaveResult.SKIPPED, result);
        verify(newsArticleRepository, never()).save(any());
    }

    @Test
    void saveItem_whenNewArticleAndClassificationExists_savesMappedArticle() {
        RestClient.Builder builder = RestClient.builder();
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        server.expect(requestTo("http://localhost:9/classify"))
                .andExpect(method(POST))
                .andRespond(withSuccess("""
                        {
                          "headline":"headline",
                          "assetType":"STOCK",
                          "symbol":"AAPL",
                          "assetScore":"0.92",
                          "symbolScore":"0.98",
                          "lexiconSymbol":"AAPL",
                          "topCandidates":["MSFT (0.88)", "AAPL (0.50)", "UNKNOWN (0.12)"],
                          "unknown":false,
                          "modelVersion":"v1"
                        }
                        """, MediaType.APPLICATION_JSON));

        newsRssService = new NewsRssService(builder.build(), newsArticleRepository);
        ReflectionTestUtils.setField(newsRssService, "modelServiceApiUrl", "http://localhost:9/classify");

        when(newsArticleRepository.findByUrl("https://example.com/article")).thenReturn(Optional.empty());
        when(newsArticleRepository.save(any(NewsArticle.class))).thenAnswer(invocation -> invocation.getArgument(0));

        NewsItem item = new NewsItem(
                "<p>Apple &amp; growth</p>",
                "https://example.com/article",
                "Fri, 01 May 2026 12:00:00 GMT",
                "<b>Apple jumps</b>",
                new NewsItem.MediaContent(" https://example.com/image.png ")
        );

        NewsRssService.SaveResult result = newsRssService.saveItem(
                new RssSource("Yahoo RSS", NewsCountry.US, NewsTopic.GENERAL, "http://unused"),
                item
        );

        assertEquals(NewsRssService.SaveResult.SAVED, result);
        verify(newsArticleRepository).save(argThat(article -> {
            assertEquals("Apple jumps", article.getTitle());
            assertEquals("Apple & growth", article.getDescription());
            assertEquals("https://example.com/image.png", article.getUrlToImage());
            assertEquals(NewsTopic.STOCK, article.getTopic());
            assertEquals("AAPL", article.getInstrumentSymbol());
            assertEquals("classification-api", article.getModelName());
            assertEquals(2, article.getInstruments().size());
            assertEquals("AAPL", article.getInstruments().getFirst().getSymbol());
            assertTrue(article.getInstruments().getFirst().isPrimaryMatch());
            assertEquals("MSFT", article.getInstruments().get(1).getSymbol());
            assertEquals("CANDIDATE", article.getInstruments().get(1).getMatchSource());
            assertNotNull(article.getPublishedDate());
            return true;
        }));
        server.verify();
    }

    @Test
    void saveItem_whenClassificationFails_savesFallbackArticle() {
        RestClient.Builder builder = RestClient.builder();
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        server.expect(requestTo("http://localhost:9/classify"))
                .andExpect(method(POST))
                .andRespond(withServerError());

        newsRssService = new NewsRssService(builder.build(), newsArticleRepository);
        ReflectionTestUtils.setField(newsRssService, "modelServiceApiUrl", "http://localhost:9/classify");

        when(newsArticleRepository.findByUrl("https://example.com/fallback")).thenReturn(Optional.empty());
        when(newsArticleRepository.save(any(NewsArticle.class))).thenAnswer(invocation -> invocation.getArgument(0));

        NewsRssService.SaveResult result = newsRssService.saveItem(
                new RssSource("Sozcu RSS", NewsCountry.TR, NewsTopic.GENERAL, "http://unused"),
                new NewsItem("desc", "https://example.com/fallback", "not-a-date", "Title", null)
        );

        assertEquals(NewsRssService.SaveResult.CLASSIFICATION_NULL, result);
        verify(newsArticleRepository).save(argThat(article -> {
            assertEquals(NewsTopic.GENERAL, article.getTopic());
            assertNull(article.getInstrumentSymbol());
            assertNull(article.getModelName());
            assertTrue(article.getInstruments().isEmpty());
            assertNotNull(article.getPublishedDate());
            return true;
        }));
        server.verify();
    }

    @Test
    void saveItem_whenExistingArticleNeedsClassificationUpdate_returnsUpdated() {
        RestClient.Builder builder = RestClient.builder();
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        server.expect(requestTo("http://localhost:9/classify"))
                .andExpect(method(POST))
                .andRespond(withSuccess("""
                        {
                          "headline":"headline",
                          "assetType":"CRYPTO",
                          "symbol":"BTCUSD",
                          "assetScore":"0.91",
                          "symbolScore":"0.95",
                          "lexiconSymbol":null,
                          "topCandidates":["ETHUSD (0.80)"],
                          "unknown":false,
                          "modelVersion":"v1"
                        }
                        """, MediaType.APPLICATION_JSON));

        newsRssService = new NewsRssService(builder.build(), newsArticleRepository);
        ReflectionTestUtils.setField(newsRssService, "modelServiceApiUrl", "http://localhost:9/classify");

        NewsArticle existing = NewsArticle.builder()
                .sourceName("Yahoo RSS")
                .country(NewsCountry.US)
                .topic(NewsTopic.GENERAL)
                .title("Old")
                .url("https://example.com/existing")
                .description("desc")
                .content("desc")
                .publishedDate(LocalDateTime.now())
                .build();
        when(newsArticleRepository.findByUrl(existing.getUrl())).thenReturn(Optional.of(existing));
        when(newsArticleRepository.save(any(NewsArticle.class))).thenAnswer(invocation -> invocation.getArgument(0));

        NewsRssService.SaveResult result = newsRssService.saveItem(
                new RssSource("Yahoo RSS", NewsCountry.US, NewsTopic.STOCK, "http://unused"),
                new NewsItem("desc", existing.getUrl(), "2026-05-01T12:00:00", "Updated", null)
        );

        assertEquals(NewsRssService.SaveResult.UPDATED, result);
        verify(newsArticleRepository).save(argThat(article -> {
            assertEquals(NewsTopic.CRYPTO, article.getTopic());
            assertEquals("BTCUSD", article.getInstrumentSymbol());
            assertEquals(2, article.getInstruments().size());
            return true;
        }));
        server.verify();
    }

    @Test
    void saveItem_whenExistingArticleAlreadyClassified_returnsSkipped() {
        RestClient.Builder builder = RestClient.builder();
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        server.expect(requestTo("http://localhost:9/classify"))
                .andExpect(method(POST))
                .andRespond(withSuccess("""
                        {
                          "headline":"headline",
                          "assetType":"STOCK",
                          "symbol":"AAPL",
                          "assetScore":"0.92",
                          "symbolScore":"0.98",
                          "lexiconSymbol":null,
                          "topCandidates":[],
                          "unknown":false,
                          "modelVersion":"v1"
                        }
                        """, MediaType.APPLICATION_JSON));

        newsRssService = new NewsRssService(builder.build(), newsArticleRepository);
        ReflectionTestUtils.setField(newsRssService, "modelServiceApiUrl", "http://localhost:9/classify");

        NewsArticle existing = NewsArticle.builder()
                .sourceName("Yahoo RSS")
                .country(NewsCountry.US)
                .topic(NewsTopic.STOCK)
                .title("Title")
                .url("https://example.com/existing")
                .description("desc")
                .content("desc")
                .modelName("classification-api")
                .instrumentSymbol("AAPL")
                .publishedDate(LocalDateTime.now())
                .instruments(new ArrayList<>(List.of(
                        NewsArticleInstrument.builder()
                                .symbol("AAPL")
                                .assetType("STOCK")
                                .score("0.98")
                                .rankOrder(1)
                                .primaryMatch(true)
                                .matchSource("MODEL")
                                .build()
                )))
                .build();
        when(newsArticleRepository.findByUrl(existing.getUrl())).thenReturn(Optional.of(existing));

        NewsRssService.SaveResult result = newsRssService.saveItem(
                new RssSource("Yahoo RSS", NewsCountry.US, NewsTopic.STOCK, "http://unused"),
                new NewsItem("desc", existing.getUrl(), "2026-05-01T12:00:00", "Updated", null)
        );

        assertEquals(NewsRssService.SaveResult.SKIPPED, result);
        verify(newsArticleRepository, never()).save(any());
        server.verify();
    }

    @Test
    void getArticlesByTopicAndCountryAfterDate_mapsSortedInstrumentDtos() {
        NewsArticle article = NewsArticle.builder()
                .id(UUID.randomUUID())
                .sourceName("Yahoo RSS")
                .authorName("Author")
                .title("Title")
                .country(NewsCountry.US)
                .topic(NewsTopic.STOCK)
                .description("Description")
                .content("Content")
                .url("https://example.com/mapped")
                .urlToImage("https://example.com/image.png")
                .publishedDate(LocalDateTime.of(2026, 5, 1, 10, 0))
                .modelName("classification-api")
                .instrumentSymbol("AAPL")
                .instruments(new ArrayList<>(List.of(
                        NewsArticleInstrument.builder()
                                .symbol("MSFT")
                                .assetType("STOCK")
                                .score("0.81")
                                .rankOrder(2)
                                .primaryMatch(false)
                                .matchSource("CANDIDATE")
                                .build(),
                        NewsArticleInstrument.builder()
                                .symbol("AAPL")
                                .assetType("STOCK")
                                .score("0.99")
                                .rankOrder(1)
                                .primaryMatch(true)
                                .matchSource("MODEL")
                                .build()
                )))
                .build();

        when(newsArticleRepository.findByTopicAndCountryAndPublishedDateAfter(eq(NewsTopic.STOCK), eq(NewsCountry.US), any()))
                .thenReturn(List.of(article));
        when(newsArticleRepository.findByPublishedDateAfter(any())).thenReturn(List.of(article));
        when(newsArticleRepository.findByTopicAndPublishedDateAfter(eq(NewsTopic.STOCK), any())).thenReturn(List.of(article));
        when(newsArticleRepository.findByCountryAndPublishedDateAfter(eq(NewsCountry.US), any())).thenReturn(List.of(article));

        List<FilteredArticleDto> combined = newsRssService.getArticlesByTopicAndCountryAfterDate(
                NewsTopic.STOCK,
                NewsCountry.US,
                LocalDate.of(2026, 4, 24)
        );
        List<FilteredArticleDto> all = newsRssService.getAllArticlesAfterDate(LocalDate.of(2026, 4, 24));
        List<FilteredArticleDto> byTopic = newsRssService.getArticlesByTopicAfterDate(NewsTopic.STOCK, LocalDate.of(2026, 4, 24));
        List<FilteredArticleDto> byCountry = newsRssService.getArticlesByCountryAfterDate(NewsCountry.US, LocalDate.of(2026, 4, 24));

        assertEquals(1, combined.size());
        FilteredArticleDto dto = combined.getFirst();
        assertEquals("Yahoo RSS", dto.source().name());
        assertEquals("AAPL", dto.instruments().getFirst().symbol());
        assertEquals("MSFT", dto.instruments().get(1).symbol());
        assertEquals(1, all.size());
        assertEquals(1, byTopic.size());
        assertEquals(1, byCountry.size());
    }

    @Test
    void fetchNews_whenAlreadyRunning_skipsExecution() {
        AtomicBoolean running = (AtomicBoolean) ReflectionTestUtils.getField(newsRssService, "fetchRunning");
        assertNotNull(running);
        running.set(true);

        newsRssService.fetchNews();

        verifyNoInteractions(newsArticleRepository);
    }

    @Test
    void refresh_fetchesYahooAndSozcuFeedsAndPersistsArticles() throws Exception {
        Map<String, NewsArticle> savedArticles = new LinkedHashMap<>();
        when(newsArticleRepository.findByUrl(anyString())).thenAnswer(invocation ->
                Optional.ofNullable(savedArticles.get(invocation.getArgument(0)))
        );
        when(newsArticleRepository.save(any(NewsArticle.class))).thenAnswer(invocation -> {
            NewsArticle article = invocation.getArgument(0);
            savedArticles.put(article.getUrl(), article);
            return article;
        });
        YahooRssFilteredResponse yahooResponse = new YahooRssFilteredResponse(new Channel(List.of(
                new NewsItem(
                        "<p>Apple &amp; growth</p>",
                        "https://example.com/apple",
                        "Fri, 01 May 2026 12:00:00 GMT",
                        "<b>Apple jumps</b>",
                        new NewsItem.MediaContent("https://example.com/apple.png")
                )
        )));
        SozcuRssResponse commodityResponse = new SozcuRssResponse(new Channel(List.of(
                new NewsItem(
                        "<p>Market update</p>",
                        "https://tr.example.com/gold",
                        "2026-05-01T12:00:00",
                        "Gold rises",
                        null
                )
        )));
        SozcuRssResponse emptyResponse = new SozcuRssResponse(new Channel(null));

        RestClient.Builder builder = RestClient.builder();
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).ignoreExpectOrder(true).build();
        server.expect(requestTo("http://mock/yahoo"))
                .andExpect(method(GET))
                .andRespond(withSuccess("""
                        <rss><channel><item>
                        <title><![CDATA[<b>Apple jumps</b>]]></title>
                        <description><![CDATA[<p>Apple &amp; growth</p>]]></description>
                        <link>https://example.com/apple</link>
                        <pubDate>Fri, 01 May 2026 12:00:00 GMT</pubDate>
                        <content url="https://example.com/apple.png"/>
                        </item></channel></rss>
                        """, MediaType.APPLICATION_XML));
        server.expect(requestTo("http://mock/sozcu/feeds-rss-category-emtia"))
                .andExpect(method(GET))
                .andRespond(withSuccess("""
                        <rss><channel><item>
                        <title><![CDATA[Gold rises]]></title>
                        <description><![CDATA[<p>Market update</p>]]></description>
                        <link>https://tr.example.com/gold</link>
                        <pubDate>2026-05-01T12:00:00</pubDate>
                        </item></channel></rss>
                        """, MediaType.APPLICATION_XML));
        server.expect(requestTo("http://mock/sozcu/feeds-rss-category-finans"))
                .andExpect(method(GET))
                .andRespond(withSuccess("<rss><channel/></rss>", MediaType.APPLICATION_XML));
        server.expect(requestTo("http://mock/sozcu/feeds-rss-category-borsa"))
                .andExpect(method(GET))
                .andRespond(withSuccess("<rss><channel/></rss>", MediaType.APPLICATION_XML));
        server.expect(requestTo("http://mock/sozcu/feeds-rss-category-kripto"))
                .andExpect(method(GET))
                .andRespond(withSuccess("<rss><channel/></rss>", MediaType.APPLICATION_XML));
        server.expect(requestTo("http://mock/classify"))
                .andExpect(method(POST))
                .andExpect(content().string(org.hamcrest.Matchers.containsString("Apple jumps Apple & growth")))
                .andRespond(withSuccess("""
                        {
                          "headline":"headline",
                          "assetType":"STOCK",
                          "symbol":"AAPL",
                          "assetScore":"0.90",
                          "symbolScore":"0.99",
                          "lexiconSymbol":"AAPL",
                          "topCandidates":["MSFT (0.80)"],
                          "unknown":false,
                          "modelVersion":"v1"
                        }
                        """, MediaType.APPLICATION_JSON));
        server.expect(requestTo("http://mock/classify"))
                .andExpect(method(POST))
                .andExpect(content().string(org.hamcrest.Matchers.containsString("Gold rises Market update")))
                .andRespond(withSuccess("""
                        {
                          "headline":"headline",
                          "assetType":"COMMODITY",
                          "symbol":"GOLD",
                          "assetScore":"0.88",
                          "symbolScore":"0.91",
                          "lexiconSymbol":null,
                          "topCandidates":[],
                          "unknown":false,
                          "modelVersion":"v1"
                        }
                        """, MediaType.APPLICATION_JSON));

        newsRssService = new NewsRssService(builder.build(), newsArticleRepository);
        ReflectionTestUtils.setField(newsRssService, "yahooRssBaseUrl", "http://mock/yahoo");
        ReflectionTestUtils.setField(newsRssService, "sozcuRssBaseUrl", "http://mock/sozcu");
        ReflectionTestUtils.setField(newsRssService, "modelServiceApiUrl", "http://mock/classify");

        newsRssService.refresh();

        assertEquals(2, savedArticles.size());
        assertTrue(savedArticles.containsKey("https://example.com/apple"));
        assertTrue(savedArticles.containsKey("https://tr.example.com/gold"));
        assertEquals(NewsTopic.STOCK, savedArticles.get("https://example.com/apple").getTopic());
        assertEquals(NewsTopic.COMMODITY, savedArticles.get("https://tr.example.com/gold").getTopic());
        server.verify();
    }
}
