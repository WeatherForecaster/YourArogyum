package com.YourArogyum.backend.service;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;

import java.io.File;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;

/**
 * In-memory vector store for Arogyum health knowledge base passages.
 * Persists embedded vectors to a JSON cache file with SHA-256 hash validation
 * to prevent unnecessary Gemini API re-embedding across application restarts.
 */
@Component
public class VectorStore {

    private static final Logger log = LoggerFactory.getLogger(VectorStore.class);

    @Value("${health.vector.cache.path:src/main/resources/health-knowledge/vectors-cache.json}")
    private String cachePath;

    @Value("${gemini.embedding.model:gemini-embedding-001}")
    private String embeddingModel;

    private final ObjectMapper objectMapper = new ObjectMapper();

    private final List<VectorEntry> entries = new ArrayList<>();
    private volatile boolean ready = false;
    private String contentHash = "";

    public record VectorEntry(
            String id,
            String title,
            String text,
            String url,
            float[] embedding
    ) {}

    public record ScoredEntry(
            VectorEntry entry,
            double score
    ) {}

    public boolean isReady() {
        return ready && !entries.isEmpty();
    }

    public synchronized void setEntries(List<VectorEntry> newEntries, String hash) {
        this.entries.clear();
        if (newEntries != null) {
            this.entries.addAll(newEntries);
        }
        this.contentHash = (hash != null) ? hash : "";
        this.ready = !this.entries.isEmpty();
    }

    public List<VectorEntry> getEntries() {
        return List.copyOf(entries);
    }

    public String getContentHash() {
        return contentHash;
    }

    /**
     * Searches passages by cosine similarity, filters by minimum similarity,
     * and returns the top-k highest scoring passages.
     */
    public List<ScoredEntry> search(float[] queryEmbedding, int topK, double minSimilarity) {
        if (!isReady() || queryEmbedding == null || queryEmbedding.length == 0) {
            return List.of();
        }

        List<ScoredEntry> scored = new ArrayList<>();
        for (VectorEntry entry : entries) {
            if (entry.embedding() == null || entry.embedding().length == 0) {
                continue;
            }
            double sim = cosineSimilarity(queryEmbedding, entry.embedding());
            if (sim >= minSimilarity) {
                scored.add(new ScoredEntry(entry, sim));
            }
        }

        scored.sort(Comparator.comparingDouble(ScoredEntry::score).reversed());

        if (scored.size() > topK) {
            return List.copyOf(scored.subList(0, topK));
        }
        return List.copyOf(scored);
    }

    /**
     * Computes cosine similarity between two float vectors.
     */
    public static double cosineSimilarity(float[] a, float[] b) {
        if (a == null || b == null || a.length == 0 || b.length == 0 || a.length != b.length) {
            return 0.0;
        }

        double dot = 0.0;
        double normA = 0.0;
        double normB = 0.0;

        for (int i = 0; i < a.length; i++) {
            dot += a[i] * b[i];
            normA += a[i] * a[i];
            normB += b[i] * b[i];
        }

        if (normA <= 0.0 || normB <= 0.0) {
            return 0.0;
        }

        return dot / (Math.sqrt(normA) * Math.sqrt(normB));
    }

    /**
     * Attempts to reload vectors from the JSON cache if it exists and the
     * content hash matches the active knowledge base.
     */
    public synchronized boolean loadCacheIfValid(String expectedHash) {
        if (expectedHash == null || expectedHash.isBlank()) {
            return false;
        }

        // 1. Try disk file path
        File file = resolveCacheFileForReading(cachePath);
        if (file != null && file.exists() && file.isFile()) {
            try {
                JsonNode root = objectMapper.readTree(file);
                if (loadFromJsonNode(root, expectedHash)) {
                    log.info("VectorStore: Loaded {} cached passage vectors from {}", entries.size(), file.getPath());
                    return true;
                }
            } catch (Exception e) {
                log.warn("VectorStore: Failed parsing vector cache from disk file {}: {}", file.getPath(), e.getMessage());
            }
        }

        // 2. Try classpath resource (e.g. bundled in JAR or target/classes)
        try {
            ClassPathResource resource = new ClassPathResource("health-knowledge/vectors-cache.json");
            if (resource.exists()) {
                try (InputStream in = resource.getInputStream()) {
                    JsonNode root = objectMapper.readTree(in);
                    if (loadFromJsonNode(root, expectedHash)) {
                        log.info("VectorStore: Loaded {} cached passage vectors from classpath resource", entries.size());
                        return true;
                    }
                }
            }
        } catch (Exception e) {
            log.warn("VectorStore: Failed reading vector cache from classpath: {}", e.getMessage());
        }

        return false;
    }

    private boolean loadFromJsonNode(JsonNode root, String expectedHash) {
        if (root == null) {
            return false;
        }

        String cachedHash = root.path("contentHash").asText("");
        if (!expectedHash.equalsIgnoreCase(cachedHash)) {
            log.info("VectorStore: Cache hash mismatch (cached: {}, expected: {}). Will re-embed.",
                    cachedHash, expectedHash);
            return false;
        }

        JsonNode passagesNode = root.path("passages");
        if (!passagesNode.isArray() || passagesNode.isEmpty()) {
            return false;
        }

        List<VectorEntry> loaded = new ArrayList<>();
        for (JsonNode item : passagesNode) {
            String id = item.path("id").asText();
            String title = item.path("title").asText();
            String text = item.path("text").asText();
            String url = item.path("url").asText();
            JsonNode embNode = item.path("embedding");

            if (!embNode.isArray() || embNode.isEmpty()) {
                continue;
            }

            float[] emb = new float[embNode.size()];
            for (int i = 0; i < embNode.size(); i++) {
                emb[i] = (float) embNode.get(i).asDouble();
            }

            loaded.add(new VectorEntry(id, title, text, url, emb));
        }

        if (loaded.isEmpty()) {
            return false;
        }

        setEntries(loaded, expectedHash);
        return true;
    }

    /**
     * Persists embedded vectors and hash to disk cache.
     */
    public synchronized void saveCache(String hash, List<VectorEntry> entriesToSave) {
        if (entriesToSave == null || entriesToSave.isEmpty()) {
            return;
        }

        File file = resolveCacheFileForWriting(cachePath);
        if (file == null) {
            log.warn("VectorStore: Unable to resolve cache file path for writing.");
            return;
        }

        try {
            if (file.getParentFile() != null && !file.getParentFile().exists()) {
                file.getParentFile().mkdirs();
            }

            List<Map<String, Object>> passagesList = new ArrayList<>();
            for (VectorEntry entry : entriesToSave) {
                passagesList.add(Map.of(
                        "id", entry.id(),
                        "title", entry.title(),
                        "text", entry.text(),
                        "url", entry.url(),
                        "embedding", entry.embedding()
                ));
            }

            Map<String, Object> root = Map.of(
                    "contentHash", hash,
                    "model", (embeddingModel != null && !embeddingModel.isBlank()) ? embeddingModel : "gemini-embedding-001",
                    "passages", passagesList
            );

            objectMapper.writeValue(file, root);
            log.info("VectorStore: Cached {} passage vectors to {}", passagesList.size(), file.getAbsolutePath());
        } catch (Exception e) {
            log.warn("VectorStore: Could not write vector cache to {}: {}", file.getAbsolutePath(), e.getMessage());
        }
    }

    private File resolveCacheFileForReading(String path) {
        if (path == null || path.isBlank()) {
            path = "src/main/resources/health-knowledge/vectors-cache.json";
        }
        File direct = new File(path);
        if (direct.exists() && direct.isFile()) {
            return direct;
        }
        File backendRel = new File("backend", path);
        if (backendRel.exists() && backendRel.isFile()) {
            return backendRel;
        }
        if (path.startsWith("backend/")) {
            File stripped = new File(path.substring(8));
            if (stripped.exists() && stripped.isFile()) {
                return stripped;
            }
        }
        return direct;
    }

    private File resolveCacheFileForWriting(String path) {
        if (path == null || path.isBlank()) {
            path = "src/main/resources/health-knowledge/vectors-cache.json";
        }
        File direct = new File(path);
        if (direct.isAbsolute() || (direct.getParentFile() != null && direct.getParentFile().exists())) {
            return direct;
        }
        File backendRel = new File("backend", path);
        if (backendRel.getParentFile() != null && backendRel.getParentFile().exists()) {
            return backendRel;
        }
        if (path.startsWith("backend/")) {
            File stripped = new File(path.substring(8));
            if (stripped.getParentFile() != null && stripped.getParentFile().exists()) {
                return stripped;
            }
        }
        return direct;
    }
}
