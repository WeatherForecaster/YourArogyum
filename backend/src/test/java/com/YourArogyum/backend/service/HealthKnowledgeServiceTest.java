package com.YourArogyum.backend.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.test.util.ReflectionTestUtils;

import java.io.File;
import java.nio.file.Path;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

class HealthKnowledgeServiceTest {

    private VectorStore vectorStore;
    private GeminiEmbeddingService embeddingService;
    private HealthKnowledgeService healthKnowledgeService;

    @BeforeEach
    void setUp() {
        vectorStore = new VectorStore();
        embeddingService = mock(GeminiEmbeddingService.class);
        healthKnowledgeService = new HealthKnowledgeService(vectorStore, embeddingService);
    }

    @Test
    @DisplayName("VectorStore: cosine similarity calculations are mathematically accurate")
    void testCosineSimilarity() {
        float[] v1 = new float[]{1.0f, 0.0f, 0.0f};
        float[] v2 = new float[]{1.0f, 0.0f, 0.0f};
        float[] v3 = new float[]{0.0f, 1.0f, 0.0f};
        float[] v4 = new float[]{-1.0f, 0.0f, 0.0f};

        assertEquals(1.0, VectorStore.cosineSimilarity(v1, v2), 0.0001, "Identical vectors must have similarity 1.0");
        assertEquals(0.0, VectorStore.cosineSimilarity(v1, v3), 0.0001, "Orthogonal vectors must have similarity 0.0");
        assertEquals(-1.0, VectorStore.cosineSimilarity(v1, v4), 0.0001, "Opposite vectors must have similarity -1.0");

        // Edge cases
        assertEquals(0.0, VectorStore.cosineSimilarity(null, v1));
        assertEquals(0.0, VectorStore.cosineSimilarity(new float[]{}, v1));
        assertEquals(0.0, VectorStore.cosineSimilarity(new float[]{1.0f}, new float[]{1.0f, 2.0f}));
    }

    @Test
    @DisplayName("VectorStore: search respects topK, threshold, and score ordering")
    void testVectorStoreSearch() {
        VectorStore.VectorEntry p1 = new VectorStore.VectorEntry("P1", "Diet", "Diet text", "http://diet", new float[]{1.0f, 0.0f, 0.0f});
        VectorStore.VectorEntry p2 = new VectorStore.VectorEntry("P2", "Exercise", "Exercise text", "http://exercise", new float[]{0.9f, 0.1f, 0.0f});
        VectorStore.VectorEntry p3 = new VectorStore.VectorEntry("P3", "Sleep", "Sleep text", "http://sleep", new float[]{0.2f, 0.8f, 0.0f});

        vectorStore.setEntries(List.of(p1, p2, p3), "mock-hash");
        assertTrue(vectorStore.isReady());

        float[] query = new float[]{1.0f, 0.0f, 0.0f};

        // Threshold 0.5 should match P1 and P2, but not P3
        List<VectorStore.ScoredEntry> results = vectorStore.search(query, 2, 0.5);
        assertEquals(2, results.size());
        assertEquals("P1", results.get(0).entry().id());
        assertTrue(results.get(0).score() > results.get(1).score());

        // Very strict threshold 0.995 should only match P1 (1.0 vs 0.9939)
        List<VectorStore.ScoredEntry> strict = vectorStore.search(query, 3, 0.995);
        assertEquals(1, strict.size());
        assertEquals("P1", strict.get(0).entry().id());
    }

    @Test
    @DisplayName("VectorStore: cache save and load with hash validation")
    void testCacheSaveAndLoadWithHash(@TempDir Path tempDir) {
        File cacheFile = tempDir.resolve("vectors-cache.json").toFile();
        ReflectionTestUtils.setField(vectorStore, "cachePath", cacheFile.getAbsolutePath());

        VectorStore.VectorEntry p1 = new VectorStore.VectorEntry(
                "P1", "Diet", "Diet text", "http://diet", new float[]{0.1f, 0.2f, 0.3f}
        );

        String hash = "hash-12345";
        vectorStore.saveCache(hash, List.of(p1));
        assertTrue(cacheFile.exists(), "Cache file must be created on disk");

        // Create new vector store and load with matching hash
        VectorStore newStore = new VectorStore();
        ReflectionTestUtils.setField(newStore, "cachePath", cacheFile.getAbsolutePath());

        boolean loaded = newStore.loadCacheIfValid("hash-12345");
        assertTrue(loaded, "Cache should load when hash matches");
        assertTrue(newStore.isReady());
        assertEquals(1, newStore.getEntries().size());
        assertEquals("P1", newStore.getEntries().get(0).id());
        assertEquals(3, newStore.getEntries().get(0).embedding().length);

        // Attempt load with mismatched hash
        VectorStore mismatchedStore = new VectorStore();
        ReflectionTestUtils.setField(mismatchedStore, "cachePath", cacheFile.getAbsolutePath());
        boolean rejected = mismatchedStore.loadCacheIfValid("different-hash");
        assertFalse(rejected, "Cache must be rejected when hash differs");
        assertFalse(mismatchedStore.isReady());
    }

    @Test
    @DisplayName("HealthKnowledgeService: chunking parses passages with sources")
    void testPassageChunking() {
        List<HealthKnowledgeService.KnowledgeChunk> chunks = healthKnowledgeService.getChunks();
        assertFalse(chunks.isEmpty());
        assertTrue(chunks.size() >= 3);

        for (HealthKnowledgeService.KnowledgeChunk chunk : chunks) {
            assertNotNull(chunk.id());
            assertNotNull(chunk.title());
            assertNotNull(chunk.text());
            assertNotNull(chunk.url());
            assertTrue(chunk.url().startsWith("http"));
        }

        assertNotNull(healthKnowledgeService.getContentHash());
        assertFalse(healthKnowledgeService.getContentHash().isBlank());
    }

    @Test
    @DisplayName("HealthKnowledgeService: fallback to keyword retrieval when vector store is not ready")
    void testFallbackWhenStoreNotReady() {
        assertFalse(vectorStore.isReady());

        HealthKnowledgeService.RetrievalResult result = healthKnowledgeService.retrieve("vegetarian protein meals");
        assertNotNull(result);
        assertFalse(result.sources().isEmpty(), "Keyword fallback should retrieve dietary guidance");
        assertTrue(result.context().contains("[S1]"));
        assertEquals("S1", result.sources().get(0).id());
    }

    @Test
    @DisplayName("Semantic query: 'tips for sugar control' misses in keyword search but catches in semantic retrieval")
    void testSemanticVsKeywordRetrieval() {
        String query = "tips for sugar control";

        // 1. Keyword search alone: "tips for sugar control" tokenizes to [tip, sugar, control].
        // None of these tokens appear in the diabetes prevention passage, so keyword search returns 0 matches.
        HealthKnowledgeService.RetrievalResult keywordResult = healthKnowledgeService.retrieveByKeyword(query);
        assertTrue(keywordResult.sources().isEmpty(),
                "Keyword matching should miss 'tips for sugar control' because exact terms are absent");

        // 2. Vector retrieval: mock query embedding to align with diabetes passage vector
        float[] diabetesVector = new float[]{0.05f, 0.95f, 0.1f};
        float[] dietVector = new float[]{0.8f, 0.1f, 0.0f};

        VectorStore.VectorEntry diabetesEntry = new VectorStore.VectorEntry(
                "passage-4",
                "Type 2 diabetes prevention and glycemic management",
                "Evidence-based lifestyle habits help prevent or delay type 2 diabetes...",
                "https://www.who.int/news-room/fact-sheets/detail/diabetes",
                diabetesVector
        );
        VectorStore.VectorEntry dietEntry = new VectorStore.VectorEntry(
                "passage-1",
                "Healthy diet and vegetarian meal ideas",
                "A healthy dietary pattern emphasizes adequacy...",
                "https://www.who.int/en/news-room/fact-sheets/detail/healthy-diet",
                dietVector
        );

        vectorStore.setEntries(List.of(dietEntry, diabetesEntry), "test-hash");
        assertTrue(vectorStore.isReady());

        // Mock query embedding pointing closely towards diabetes vector
        float[] queryEmbedding = new float[]{0.08f, 0.92f, 0.09f};
        when(embeddingService.embed(query)).thenReturn(queryEmbedding);

        HealthKnowledgeService.RetrievalResult semanticResult = healthKnowledgeService.retrieve(query);

        assertNotNull(semanticResult);
        assertFalse(semanticResult.sources().isEmpty(), "Semantic retrieval must catch diabetes guidance");
        assertEquals("Type 2 diabetes prevention and glycemic management", semanticResult.sources().get(0).title());
        assertTrue(semanticResult.context().contains("[S1] Type 2 diabetes prevention and glycemic management"));
        assertEquals("S1", semanticResult.sources().get(0).id());
    }

    @Test
    @DisplayName("HealthKnowledgeService: retrieve never throws on null, blank, or embedding failures")
    void testNeverThrows() {
        assertDoesNotThrow(() -> {
            HealthKnowledgeService.RetrievalResult r1 = healthKnowledgeService.retrieve(null);
            assertEquals("", r1.context());
            assertTrue(r1.sources().isEmpty());

            HealthKnowledgeService.RetrievalResult r2 = healthKnowledgeService.retrieve("   ");
            assertEquals("", r2.context());

            // Simulate embedding service throwing an exception
            when(embeddingService.embed(anyString())).thenThrow(new RuntimeException("Simulated API failure"));
            vectorStore.setEntries(List.of(
                    new VectorStore.VectorEntry("P1", "Title", "Text", "http://url", new float[]{1.0f})
            ), "hash");

            HealthKnowledgeService.RetrievalResult r3 = healthKnowledgeService.retrieve("general wellness advice");
            assertNotNull(r3); // gracefully fell back to keyword search
        });
    }
}
