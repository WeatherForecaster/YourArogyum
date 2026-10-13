
package com.YourArogyum.backend.service;

import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class HealthKnowledgeService {

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

    private final List<KnowledgeChunk> chunks;

    public HealthKnowledgeService() {
        this.chunks = loadKnowledgeBase();
    }

    public RetrievalResult retrieve(String query) {
        if (query == null || query.isBlank()) {
            return new RetrievalResult("", List.of());
        }

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

        List<ScoredChunk> selected;

        if (ranked.isEmpty()) {
            return new RetrievalResult("", List.of());
        }

        int bestScore = ranked.get(0).score();

        selected = ranked.stream()
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
    }

    private static List<KnowledgeChunk> loadKnowledgeBase() {
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

            List<KnowledgeChunk> loaded = new ArrayList<>();

            String[] sections = content.split(
                    "(?m)(?=^##\\s+)"
            );

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

                loaded.add(new KnowledgeChunk(
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

            return List.copyOf(loaded);

        } catch (IOException e) {
            throw new IllegalStateException(
                    "Unable to read the health knowledge file.", e
            );
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

    private record KnowledgeChunk(
            String title,
            String text,
            String url
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
