package com.galaxyitt.novahr;

import com.google.gson.Gson;
import com.google.gson.JsonArray;
import com.google.gson.JsonObject;
import com.machinezoo.sourceafis.FingerprintImage;
import com.machinezoo.sourceafis.FingerprintImageOptions;
import com.machinezoo.sourceafis.FingerprintMatcher;
import com.machinezoo.sourceafis.FingerprintTemplate;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.Base64;

/**
 * Tiny CLI bridge around the open-source SourceAFIS engine so the Node backend
 * can extract fingerprint templates from images and run 1:N identification,
 * without any paid vendor SDK.
 *
 * Protocol: argv[0] = command, JSON payload on stdin, single JSON line on stdout.
 *
 *   extract   { "imageB64": "<png>", "dpi": 500 }
 *             -> { "success": true, "template_b64": "<cbor>" }
 *
 *   identify  { "probeImageB64": "<png>", "dpi": 500, "threshold": 40,
 *               "gallery": [ { "id": "...", "template_b64": "<cbor>" }, ... ] }
 *             -> { "success": true, "template_id": "...", "score": 55.1 }
 *             -> { "success": false, "error": "no_match", "best_score": 12.3 }
 *
 *   status    (no input) -> { "available": true, "engine": "sourceafis-3.18.1" }
 */
public final class MatcherCli {
    private static final Gson GSON = new Gson();

    public static void main(String[] args) {
        String command = args.length > 0 ? args[0] : "";
        try {
            switch (command) {
                case "status" -> out(status());
                case "extract" -> out(extract(readStdin()));
                case "identify" -> out(identify(readStdin()));
                default -> {
                    out(error("unknown_command: " + command));
                    System.exit(1);
                }
            }
        } catch (Exception e) {
            out(error(e.getClass().getSimpleName() + ": " + e.getMessage()));
            System.exit(1);
        }
    }

    private static JsonObject status() {
        JsonObject o = new JsonObject();
        o.addProperty("available", true);
        o.addProperty("engine", "sourceafis-3.18.1");
        return o;
    }

    private static JsonObject extract(String payload) {
        JsonObject in = GSON.fromJson(payload, JsonObject.class);
        double dpi = in.has("dpi") ? in.get("dpi").getAsDouble() : 500;
        byte[] image = decode(in.get("imageB64").getAsString());

        FingerprintTemplate template = templateFromImage(image, dpi);
        String templateB64 = Base64.getEncoder().encodeToString(template.toByteArray());

        JsonObject o = new JsonObject();
        o.addProperty("success", true);
        o.addProperty("template_b64", templateB64);
        return o;
    }

    private static JsonObject identify(String payload) {
        JsonObject in = GSON.fromJson(payload, JsonObject.class);
        double dpi = in.has("dpi") ? in.get("dpi").getAsDouble() : 500;
        double threshold = in.has("threshold") ? in.get("threshold").getAsDouble() : 40;
        byte[] probeImage = decode(in.get("probeImageB64").getAsString());

        FingerprintTemplate probe = templateFromImage(probeImage, dpi);
        FingerprintMatcher matcher = new FingerprintMatcher(probe);

        JsonArray gallery = in.getAsJsonArray("gallery");
        String bestId = null;
        double bestScore = Double.NEGATIVE_INFINITY;

        for (int i = 0; i < gallery.size(); i++) {
            JsonObject item = gallery.get(i).getAsJsonObject();
            String id = item.get("id").getAsString();
            byte[] candidateBytes;
            try {
                candidateBytes = decode(item.get("template_b64").getAsString());
                FingerprintTemplate candidate = new FingerprintTemplate(candidateBytes);
                double score = matcher.match(candidate);
                if (score > bestScore) {
                    bestScore = score;
                    bestId = id;
                }
            } catch (Exception ignore) {
                // Skip unreadable/legacy templates rather than failing the whole scan.
            }
        }

        JsonObject o = new JsonObject();
        if (bestId != null && bestScore >= threshold) {
            o.addProperty("success", true);
            o.addProperty("template_id", bestId);
            o.addProperty("score", bestScore);
        } else {
            o.addProperty("success", false);
            o.addProperty("error", "no_match");
            o.addProperty("best_score", bestScore == Double.NEGATIVE_INFINITY ? 0 : bestScore);
        }
        return o;
    }

    private static FingerprintTemplate templateFromImage(byte[] image, double dpi) {
        FingerprintImage fp = new FingerprintImage(image, new FingerprintImageOptions().dpi(dpi));
        return new FingerprintTemplate(fp);
    }

    private static JsonObject error(String message) {
        JsonObject o = new JsonObject();
        o.addProperty("success", false);
        o.addProperty("error", message);
        return o;
    }

    private static byte[] decode(String b64) {
        return Base64.getDecoder().decode(b64.trim());
    }

    private static void out(JsonObject o) {
        System.out.println(GSON.toJson(o));
    }

    private static String readStdin() throws Exception {
        try (InputStream in = System.in) {
            ByteArrayOutputStream buffer = new ByteArrayOutputStream();
            byte[] chunk = new byte[8192];
            int n;
            while ((n = in.read(chunk)) != -1) {
                buffer.write(chunk, 0, n);
            }
            return buffer.toString(StandardCharsets.UTF_8);
        }
    }

    private MatcherCli() {}
}
