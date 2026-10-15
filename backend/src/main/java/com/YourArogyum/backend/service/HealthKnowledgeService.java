package com.YourArogyum.backend.service;

import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HexFormat;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

/**
 * Health knowledge retrieval service.
 * Supports semantic vector retrieval via Gemini embeddings with cached passage vectors,
 * and seamlessly falls back to keyword-based matching if embeddings fail or vector store is unready.
 */
@Service
public class HealthKnowledgeService {

    private static final Logger log = LoggerFactory.getLogger(HealthKnowledgeService.class);

    private static final String RESOURCE_PATH =
            "health-knowledge/health-guidance.md";

    private static final Pattern SOURCE_PATTERN = Pattern.compile(
            "(?m)^Source:\\s*(https?://\\S+)\\s*$"
    );

    private static final Pattern TOKEN_PATTERN =
            Pattern.compile("[a-zA-Z]{3,}");

    private static final Set<String> STOP_WORDS = Set.of(
            "the", "and", "for", "with", "your", "what", "are",
            "can", "how", "you", "me", "give", "some", "about",
            "from", "that", "this", "into", "does", "should",
            "could", "would", "please", "tell", "more", "help",
            "hello", "hi", "is", "of", "to", "in", "on", "not",
            "a", "an", "i", "my", "do", "it", "be", "or", "as",
            "at", "by", "we", "our", "when", "why", "where",
            "which", "much", "many", "there", "their", "they",
            "them", "then", "than", "have", "has", "had"
    );

    private final VectorStore vectorStore;
    private final GeminiEmbeddingService embeddingService;
    private final List<KnowledgeChunk> chunks;
    private final String contentHash;

    @Value("${health.vector.min-similarity:0.55}")
    private double minSimilarity = 0.55;

    public HealthKnowledgeService(VectorStore vectorStore, GeminiEmbeddingService embeddingService) {
        this.vectorStore = vectorStore;
        this.embeddingService = embeddingService;
        KnowledgeBaseData data = loadKnowledgeBase();
        this.chunks = data.chunks();
        this.contentHash = data.hash();
    }

    @PostConstruct
    public void initVectorStore() {
        if (vectorStore == null) {
            return;
        }

        try {
            boolean loaded = vectorStore.loadCacheIfValid(contentHash);
            if (loaded) {
                log.info("HealthKnowledgeService: Vector store ready from cache (hash: {})", contentHash);
                return;
            }

            log.info("HealthKnowledgeService: Cache miss or hash mismatch. Embedding {} knowledge passages via Gemini...",
                    chunks.size());
            List<VectorStore.VectorEntry> entries = new ArrayList<>();

            for (KnowledgeChunk chunk : chunks) {
                String textToEmbed = chunk.title() + "\n" + chunk.text();
                float[] emb = embeddingService.embed(textToEmbed);
                if (emb == null || emb.length == 0) {
                    log.warn("HealthKnowledgeService: Could not embed passage '{}'. Vector store unready, using keyword fallback.",
                            chunk.title());
                    return;
                }
                entries.add(new VectorStore.VectorEntry(
                        chunk.id(),
                        chunk.title(),
                        chunk.text(),
                        chunk.url(),
                        emb
                ));
            }

            vectorStore.setEntries(entries, contentHash);
            vectorStore.saveCache(contentHash, entries);
            log.info("HealthKnowledgeService: Embedded and cached {} passages. Vector store is ready.", entries.size());

        } catch (Throwable t) {
            log.warn("HealthKnowledgeService: Vector store initialization failed: {}. Will use keyword fallback.",
                    t.getMessage());
        }
    }

    /**
     * Primary retrieval entry point: attempts semantic vector retrieval first,
     * falling back to keyword retrieval if embeddings fail or store isn't ready.
     * Never throws exceptions to the caller.
     */
    public RetrievalResult retrieve(String query) {
        if (query == null || query.isBlank()) {
            return new RetrievalResult("", List.of());
        }

        try {
            if (vectorStore != null && vectorStore.isReady()) {
                float[] queryVector = embeddingService.embed(query);
                if (queryVector != null && queryVector.length > 0) {
                    List<VectorStore.ScoredEntry> hits = vectorStore.search(queryVector, 3, minSimilarity);

                    String scoreSummary = hits.stream()
                            .map(h -> h.entry().title() + " [score=" + String.format(Locale.ROOT, "%.4f", h.score()) + "]")
                            .collect(Collectors.joining(", "));

                    log.info("HealthKnowledge retrieval for query '{}': used VECTOR retrieval (matched {} passages: [{}])",
                            sanitizeForLog(query), hits.size(), scoreSummary);

                    if (hits.isEmpty()) {
                        return new RetrievalResult("", List.of());
                    }

                    StringBuilder context = new StringBuilder();
                    List<Source> sources = new ArrayList<>();

                    for (int i = 0; i < hits.size(); i++) {
                        VectorStore.VectorEntry entry = hits.get(i).entry();
                        String id = "S" + (i + 1);

                        context.append("[")
                                .append(id)
                                .append("] ")
                                .append(entry.title())
                                .append("\n")
                                .append(entry.text())
                                .append("\nSource URL: ")
                                .append(entry.url())
                                .append("\n\n");

                        sources.add(new Source(
                                id,
                                entry.title(),
                                entry.url()
                        ));
                    }

                    return new RetrievalResult(
                            context.toString().trim(),
                            List.copyOf(sources)
                    );
                } else {
                    log.info("HealthKnowledge retrieval for query '{}': used KEYWORD fallback (query embedding failed)",
                            sanitizeForLog(query));
                    return retrieveByKeyword(query);
                }
            } else {
                log.info("HealthKnowledge retrieval for query '{}': used KEYWORD fallback (vector store not ready)",
                        sanitizeForLog(query));
                return retrieveByKeyword(query);
            }
        } catch (Throwable t) {
            log.warn("HealthKnowledge retrieval error for query '{}': {}. Falling back to KEYWORD.",
                    sanitizeForLog(query), t.getMessage());
            return retrieveByKeyword(query);
        }
    }

    /**
     * Fallback keyword-based retrieval using token overlap.
     */
    public RetrievalResult retrieveByKeyword(String query) {
        if (query == null || query.isBlank()) {
            return new RetrievalResult("", List.of());
        }

        try {
            Set<String> queryTerms = tokenize(query);

            if (queryTerms.isEmpty()) {
                return new RetrievalResult("", List.of());
            }

            List<ScoredChunk> ranked = new ArrayList<>();

            for (KnowledgeChunk chunk : chunks) {
                Set<String> documentTerms = tokenize(
                        chunk.title() + " " + chunk.text()
                );

                int score = 0;

                for (String term : queryTerms) {
                    if (documentTerms.contains(term)) {
                        score++;
                    }
                }

                if (score > 0) {
                    ranked.add(new ScoredChunk(chunk, score));
                }
            }

            ranked.sort(
                    Comparator.comparingInt(ScoredChunk::score).reversed()
            );

            if (ranked.isEmpty()) {
                return new RetrievalResult("", List.of());
            }

            int bestScore = ranked.get(0).score();

            List<ScoredChunk> selected = ranked.stream()
                    .filter(chunk -> chunk.score() == bestScore)
                    .limit(3)
                    .toList();

            StringBuilder context = new StringBuilder();
            List<Source> sources = new ArrayList<>();

            for (int i = 0; i < selected.size(); i++) {
                KnowledgeChunk chunk = selected.get(i).chunk();
                String id = "S" + (i + 1);

                context.append("[")
                        .append(id)
                        .append("] ")
                        .append(chunk.title())
                        .append("\n")
                        .append(chunk.text())
                        .append("\nSource URL: ")
                        .append(chunk.url())
                        .append("\n\n");

                sources.add(new Source(
                        id,
                        chunk.title(),
                        chunk.url()
                ));
            }

            return new RetrievalResult(
                    context.toString().trim(),
                    List.copyOf(sources)
            );
        } catch (Throwable t) {
            log.warn("Keyword retrieval unexpected error: {}", t.getMessage());
            return new RetrievalResult("", List.of());
        }
    }

    public List<KnowledgeChunk> getChunks() {
        return List.copyOf(chunks);
    }

    public String getContentHash() {
        return contentHash;
    }

    private static KnowledgeBaseData loadKnowledgeBase() {
        ClassPathResource resource =
                new ClassPathResource(RESOURCE_PATH);

        if (!resource.exists()) {
            throw new IllegalStateException(
                    "Health knowledge file not found: " + RESOURCE_PATH
            );
        }

        try (var input = resource.getInputStream()) {
            String content = new String(
                    input.readAllBytes(),
                    StandardCharsets.UTF_8
            );

            String hash = computeSha256(content);

            List<KnowledgeChunk> loaded = new ArrayList<>();

            String[] sections = content.split(
                    "(?m)(?=^##\\s+)"
            );

            int index = 0;
            for (String section : sections) {
                String trimmed = section.strip();

                if (!trimmed.startsWith("## ")) {
                    continue;
                }

                int newline = trimmed.indexOf('\n');

                if (newline < 0) {
                    continue;
                }

                String title = trimmed
                        .substring(3, newline)
                        .trim();

                String body = trimmed.substring(newline + 1);

                Matcher sourceMatcher =
                        SOURCE_PATTERN.matcher(body);

                if (!sourceMatcher.find()) {
                    continue;
                }

                String sourceUrl = sourceMatcher.group(1);

                body = sourceMatcher.replaceAll("").trim();
                index++;
                String id = "passage-" + index;

                loaded.add(new KnowledgeChunk(
                        id,
                        title,
                        body,
                        sourceUrl
                ));
            }

            if (loaded.isEmpty()) {
                throw new IllegalStateException(
                        "No valid health knowledge sections were found."
                );
            }

            return new KnowledgeBaseData(List.copyOf(loaded), hash);

        } catch (IOException e) {
            throw new IllegalStateException(
                    "Unable to read the health knowledge file.", e
            );
        }
    }

    private static String computeSha256(String input) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(input.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (NoSuchAlgorithmException e) {
            return Integer.toHexString(input.hashCode());
        }
    }

    private static Set<String> tokenize(String text) {
        Set<String> tokens = new HashSet<>();

        Matcher matcher = TOKEN_PATTERN.matcher(
                text.toLowerCase(Locale.ROOT)
        );

        while (matcher.find()) {
            String word = normalize(matcher.group());

            if (!STOP_WORDS.contains(word)) {
                tokens.add(word);
            }
        }

        return tokens;
    }

    private static String normalize(String word) {
        if (word.length() > 5 && word.endsWith("ing")) {
            return word.substring(0, word.length() - 3);
        }

        if (word.length() > 4 && word.endsWith("ies")) {
            return word.substring(0, word.length() - 3) + "y";
        }

        if (word.length() > 4
                && word.endsWith("s")
                && !word.endsWith("ss")) {
            return word.substring(0, word.length() - 1);
        }

        return word;
    }

    private static String sanitizeForLog(String text) {
        if (text == null) return "";
        return text.replace('\n', ' ').replace('\r', ' ').trim();
    }

    public record KnowledgeChunk(
            String id,
            String title,
            String text,
            String url
    ) {}

    private record KnowledgeBaseData(
            List<KnowledgeChunk> chunks,
            String hash
    ) {}

    private record ScoredChunk(
            KnowledgeChunk chunk,
            int score
    ) {}

    public record Source(
            String id,
            String title,
            String url
    ) {}

    public record RetrievalResult(
            String context,
            List<Source> sources
    ) {}
}
