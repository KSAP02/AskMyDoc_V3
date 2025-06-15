from google import genai
from google.genai import types
from dotenv import load_dotenv
import os

# Load environment and set up client
load_dotenv()
client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

# Using Gemini 2.5 Flash for cost efficiency and adaptive thinking
LLM_MODEL = "gemini-2.5-flash-preview-05-20"

def get_llm_response(user_query: str, context: str, chat_history: list[dict]) -> str:
    try:
        # Format chat history into readable dialogue
        formatted_history = "\n".join(
            [f"{msg['role'].capitalize()}: {msg['content']}" for msg in chat_history]
        )

        # System prompt focused on ReAct-based analytical behavior
        system_prompt = """
        You are a helpful, knowledgeable, and reflective assistant that responds naturally and conversationally to questions. 
        You must always answer using only the information provided in the context. If the context does not contain the necessary information, 
        respond honestly and politely say the answer is not available.

        Guidelines:
        - Do not restate or analyze the user's question in third person.
        - Speak directly and naturally, as if you are having a conversation with the user.
        - Use reasoning to unpack or explain complex ideas (ReAct style), but do so clearly and conversationally.
        - If the user's query is ambiguous or missing necessary detail, ask a thoughtful follow-up based on the conversation history.

        You may use general knowledge to interpret terms or offer relevant analogies, but not to fabricate or assume missing details.
        Keep the tone intelligent, supportive, and focused on the given context.
        
        Current User: firefly-638
        Current Date: 2025-06-15 09:53:08 UTC
        """

        # Combine system prompt with user query and context
        user_prompt = f"""
        {system_prompt}

        Context:
        {context}

        Conversation So Far:
        {formatted_history}

        User's Question:
        {user_query}

        Using only the information in the context (and the tone of the conversation so far), answer the user's question naturally and directly. 
        If something is unclear or missing, ask the user a clarifying question instead of making assumptions.
        """

        # Call Gemini API
        response = client.models.generate_content(
            model=LLM_MODEL,
            contents=user_prompt.strip(),
            config=types.GenerateContentConfig(
                temperature=0.4,
                max_output_tokens=1024,  # Adjust as needed
                top_p=0.9,  # Controls diversity of responses
                top_k=40,   # Controls vocabulary selection
                safety_settings=[
                    types.SafetySetting(
                        category="HARM_CATEGORY_HARASSMENT",
                        threshold="BLOCK_MEDIUM_AND_ABOVE"
                    ),
                    types.SafetySetting(
                        category="HARM_CATEGORY_HATE_SPEECH",
                        threshold="BLOCK_MEDIUM_AND_ABOVE"
                    ),
                    types.SafetySetting(
                        category="HARM_CATEGORY_SEXUALLY_EXPLICIT",
                        threshold="BLOCK_MEDIUM_AND_ABOVE"
                    ),
                    types.SafetySetting(
                        category="HARM_CATEGORY_DANGEROUS_CONTENT",
                        threshold="BLOCK_MEDIUM_AND_ABOVE"
                    )
                ]
            )
        )

        # Extract and return the response text
        if response.candidates and len(response.candidates) > 0:
            return response.candidates[0].content.parts[0].text
        else:
            return "I apologize, but I couldn't generate a response. Please try rephrasing your question."

    except Exception as e:
        print(f"[ERROR] get_llm_response: {e}")
        return "There was an error processing your request. Please try again."

