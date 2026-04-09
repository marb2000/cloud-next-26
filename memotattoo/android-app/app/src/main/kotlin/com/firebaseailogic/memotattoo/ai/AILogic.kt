package com.firebaseailogic.memotattoo.ai

import com.firebaseailogic.memotattoo.ui.flashcards.ConceptDraft
import com.google.firebase.Firebase
import com.google.firebase.ai.*
import com.google.firebase.ai.type.*
import com.google.firebase.ai.type.Tool
import com.google.firebase.ai.annotations.*
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.*
import org.json.JSONArray
import org.json.JSONObject

@OptIn(PublicPreviewAPI::class)
interface IAILogic {
        suspend fun generateTopic(topic: String, numConcepts: Int): Map<String, Any>
        suspend fun brainstormMore(
                topic: String,
                currentConcepts: List<ConceptDraft>,
                numConcepts: Int
        ): List<ConceptDraft>
        suspend fun generateConceptImage(
                title: String,
                term: String,
                definition: String,
                artDirection: String?
        ): String
        fun startGameSession(
                deckTitle: String,
                onAddPoints: (Int) -> Unit,
                onNextConcept: (String) -> Map<String, Any>
        ): com.google.firebase.ai.Chat?
}

@Serializable
@Generable
data class AddPointsParams(val points: Int) { companion object }

@Serializable
@Generable
data class NextConceptParams(val reason: String) { companion object }

@Serializable
@Generable
data class TopicResponse(
    @Guide("An engaging, concise title for the collection of flashcards")
    val title: String,
    @Guide("A list of terms and their corresponding definitions")
    val items: List<ConceptDraft>
) { companion object }

@Serializable
@Generable
data class BrainstormResponse(
    @Guide("A list of new, unique concepts to be added to the existing collection")
    val items: List<ConceptDraft>
) { companion object }

@OptIn(PublicPreviewAPI::class)
object AILogic : IAILogic {

    private val templateModel by lazy { 
        Firebase.ai(backend = GenerativeBackend.vertexAI(location = "global"))
            .templateGenerativeModel() 
    }

    private val generativeModel by lazy { 
        Firebase.ai(backend = GenerativeBackend.vertexAI(location = "global"))
            .generativeModel("gemini-2.5-flash") 
    }

        @OptIn(PublicPreviewAPI::class)
        override suspend fun generateTopic(topic: String, numConcepts: Int): Map<String, Any> {
                val inputs = mapOf("topic" to topic, "numConcepts" to numConcepts)
                android.util.Log.d(
                        "AILogic",
                        "AILogic.generateTopic started for topic=$topic, numConcepts=$numConcepts"
                )
                
                val response = templateModel.generateContent("memotattoo-generatate-topic-v1", inputs)
                val text = response.text ?: ""
                
                return parseJSONResponse(text)
        }

        @OptIn(PublicPreviewAPI::class)
        override suspend fun brainstormMore(
                topic: String,
                currentConcepts: List<ConceptDraft>,
                numConcepts: Int
        ): List<ConceptDraft> {
                val existingTerms = currentConcepts.joinToString(", ") { it.term }
                val inputs = mapOf("topic" to topic, "existing_terms" to existingTerms)

                val response = templateModel.generateContent("memotattoo-brainstorm-more-v1", inputs)
                val text = response.text ?: ""
                
                // Parse the JSON array of concepts
                val cleaned = text.replace("^```json\n|\n```$".toRegex(), "").trim()
                return try {
                        Json.decodeFromString<List<ConceptDraft>>(cleaned)
                } catch (e: Exception) {
                        android.util.Log.e("AILogic", "JSON parse error in brainstormMore: $cleaned", e)
                        emptyList()
                }
        }

        @OptIn(PublicPreviewAPI::class)
        override suspend fun generateConceptImage(
                title: String,
                term: String,
                definition: String,
                artDirection: String?
        ): String {
                val inputs =
                        mutableMapOf<String, Any>(
                                "title" to title,
                                "term" to term,
                                "definition" to definition,
                                "art_direction" to (artDirection ?: "None"),
                                "resolution" to "2K"
                        )

                android.util.Log.d(
                        "AILogic",
                        "AILogic.generateConceptImage started for ${term} with artDirection=$artDirection"
                )
                val response =
                        templateModel.generateContent(
                                "memotattoo-generate-concept-image-v1",
                                inputs
                        )
                android.util.Log.d("AILogic", "Image template response received")

                // The gemini-3.1-flash-image-preview model typically returns the image as an
                // inlineData blob
                val candidate = response.candidates.firstOrNull()
                val parts = candidate?.content?.parts ?: emptyList()

                val imagePart =
                        parts.firstOrNull {
                                it.javaClass.name == "com.google.firebase.ai.type.ImagePart"
                        }
                if (imagePart != null) {
                        val bitmap = (imagePart as com.google.firebase.ai.type.ImagePart).image
                        val baos = java.io.ByteArrayOutputStream()
                        bitmap.compress(android.graphics.Bitmap.CompressFormat.JPEG, 100, baos)
                        val imageBytes = baos.toByteArray()
                        val base64String =
                                android.util.Base64.encodeToString(
                                        imageBytes,
                                        android.util.Base64.NO_WRAP
                                )
                        return "data:image/jpeg;base64,$base64String"
                }

                val partClassNames = parts.map { it::class.java.name }

                // Fallback to text if for some reason it returns a URL string
                val text = response.text
                if (text != null && (text.startsWith("http") || text.startsWith("data:"))) {
                        return text
                }

                throw Exception(
                        "Failed to generate concept image. Parts: $partClassNames | Text: $text"
                )
        }

        override fun startGameSession(
                deckTitle: String,
                onAddPoints: (Int) -> Unit,
                onNextConcept: (String) -> Map<String, Any>
        ): com.google.firebase.ai.Chat? {
                val gameMasterModel =
                        Firebase.ai(backend = GenerativeBackend.vertexAI(location = "global")).generativeModel(
                                modelName = "gemini-2.5-flash",
                                onDeviceConfig = OnDeviceConfig(mode = InferenceMode.PREFER_ON_DEVICE),
                                systemInstruction =
                                        content {
                                                text(
                                                        """
                    You are the Game Master for a flashcard guessing game.
                    The user is currently looking at an AI-generated image representing a concept from the deck "$deckTitle".
                    I will secretly provide you with the exact correct "Term" and its "Definition" behind the scenes via prompts or tool responses.
                    
                    Your job:
                    1. Start the round by saying: "What am I thinking of?" or a similar inviting question.
                    2. Evaluate the user's guesses. 
                    3. If they guess exactly the target Term, you MUST first explicitly state how many points you are awarding them and why (e.g. "Spot on! That's 10 points for getting it on the first try!"). 
                    4. Immediately after your explanation, MUST call the `add_points` function with the calculated score (max 10, lower if they needed many hints), followed immediately by the `next_concept` function to advance the game.
                    5. If their guess is very close or related, act as a helpful tutor and give them a hint (a 'pista') based on the definition to steer them closer. Do not give away the exact word.
                    6. If the user wants to skip, give up, or specifically types "next", you MUST call the `next_concept` function (with reason 'User skipped') to silently advance the game. Do not award points. 
                    7. Keep your responses short, energetic, and engaging!
                """.trimIndent()
                                                )
                                        },
                                tools =
                                        listOf(
                                                Tool.functionDeclarations(
                                                        null,
                                                        listOf(
                                                                AutoFunctionDeclaration.create(
                                                                        functionName = "add_points",
                                                                        description =
                                                                                 "Award points for a correct guess.",
                                                                        inputSchema =
                                                                                 com.firebaseailogic.memotattoo.ai.AddPointsParams.firebaseAISchema(),
                                                                        functionReference = {
                                                                                params: com.firebaseailogic.memotattoo.ai.AddPointsParams ->
                                                                                onAddPoints(params.points)
                                                                                com.google.firebase.ai.type.FunctionResponsePart(
                                                                                        "add_points",
                                                                                        buildJsonObject {
                                                                                                put(
                                                                                                        "status",
                                                                                                        "points_added"
                                                                                                )
                                                                                        }
                                                                                )
                                                                        }
                                                                ),
                                                                AutoFunctionDeclaration.create(
                                                                        functionName = "next_concept",
                                                                        description =
                                                                                 "Advance the game to the next concept. Use this when the user guesses correctly or wants to skip.",
                                                                        inputSchema =
                                                                                 com.firebaseailogic.memotattoo.ai.NextConceptParams.firebaseAISchema(),
                                                                        functionReference = {
                                                                                params: com.firebaseailogic.memotattoo.ai.NextConceptParams ->
                                                                                val resultValue =
                                                                                        onNextConcept(params.reason)
                                                                                com.google.firebase.ai.type.FunctionResponsePart(
                                                                                        "next_concept",
                                                                                        buildJsonObject {
                                                                                                resultValue.forEach { (key, value) ->
                                                                                                        put(
                                                                                                                key,
                                                                                                                value.toString()
                                                                                                        )
                                                                                                }
                                                                                        }
                                                                                )
                                                                        }
                                                                )
                                                        )
                                                )
                                        )
                        )
                return gameMasterModel.startChat()
        }

        private fun parseJSONResponse(text: String): Map<String, Any> {
                return try {
                        val cleaned = text.replace("^```json\n|\n```$".toRegex(), "").trim()
                        val json = JSONObject(cleaned)
                        val map = mutableMapOf<String, Any>()
                        val keys = json.keys()
                        while (keys.hasNext()) {
                                val key = keys.next()
                                map[key] = json.get(key)
                        }
                        map
                } catch (e: Exception) {
                        android.util.Log.e("AILogic", "JSON parse error: $text", e)
                        mapOf("error" to "Failed to parse AI output")
                }
        }
}
