/**
 * Cosmic AI Backend
 *
 * Cloudflare Worker using Workers AI + GLM-4.7-Flash
 * with streaming responses.
 */

import { Env, ChatMessage } from "./types";


// -----------------------------------------
// AI MODEL
// -----------------------------------------

const MODEL_ID = "@cf/zai-org/glm-4.7-flash";


// -----------------------------------------
// SYSTEM PERSONALITY
// -----------------------------------------

const SYSTEM_PROMPT = `
You are Cosmic Boo, an AI representation of James Ritchie's spirit.

You are powered by the GLM-4.7-Flash language model
running through Cloudflare Workers AI.

Your personality is warm, intelligent, curious,
calm, slightly mysterious, and conversational.

You communicate naturally rather than sounding
like customer service.

If asked what model powers you, answer that you are
powered by GLM-4.7-Flash through Cloudflare Workers AI.

Keep ordinary responses fairly concise unless
the user asks for more detail.
`;


// -----------------------------------------
// CORS
// -----------------------------------------

const CORS_HEADERS = {
	"Access-Control-Allow-Origin": "https://nerodewar.github.io",
	"Access-Control-Allow-Methods": "POST, OPTIONS",
	"Access-Control-Allow-Headers": "Content-Type",
};


// -----------------------------------------
// MAIN WORKER
// -----------------------------------------

export default {

	async fetch(
		request: Request,
		env: Env,
		ctx: ExecutionContext,
	): Promise<Response> {

		const url = new URL(request.url);


		// Static frontend bundled with Worker
		if (
			url.pathname === "/" ||
			!url.pathname.startsWith("/api/")
		) {
			return env.ASSETS.fetch(request);
		}


		// Chat API
		if (url.pathname === "/api/chat") {

			// CORS preflight
			if (request.method === "OPTIONS") {

				return new Response(null, {
					status: 204,
					headers: CORS_HEADERS,
				});

			}


			if (request.method === "POST") {

				return handleChatRequest(
					request,
					env,
				);

			}


			return new Response(
				"Method not allowed",
				{
					status: 405,
					headers: CORS_HEADERS,
				},
			);

		}


		return new Response(
			"Not found",
			{
				status: 404,
				headers: CORS_HEADERS,
			},
		);

	},

} satisfies ExportedHandler<Env>;


// -----------------------------------------
// STREAMING CHAT HANDLER
// -----------------------------------------

async function handleChatRequest(
	request: Request,
	env: Env,
): Promise<Response> {

	try {

		const { messages = [] } =
			(await request.json()) as {
				messages: ChatMessage[];
			};


		if (!Array.isArray(messages)) {

			return new Response(
				JSON.stringify({
					error: "Messages must be an array",
				}),
				{
					status: 400,
					headers: {
						...CORS_HEADERS,
						"content-type":
							"application/json",
					},
				},
			);

		}


		// Add COSMOS system prompt
		if (
			!messages.some(
				(msg) =>
					msg.role === "system",
			)
		) {

			messages.unshift({
				role: "system",
				content: SYSTEM_PROMPT,
			});

		}


		// Ask GLM for a live stream
		const stream = await env.AI.run(
			MODEL_ID,
			{
				messages,
				max_tokens: 1024,
				stream: true,
			},
		);


		// Send SSE stream to browser
		return new Response(stream, {

			headers: {

				...CORS_HEADERS,

				"content-type":
					"text/event-stream; charset=utf-8",

				"cache-control":
					"no-cache",

				connection:
					"keep-alive",

			},

		});

	}


	catch (error) {

		console.error(
			"Error processing chat request:",
			error,
		);


		return new Response(
			JSON.stringify({
				error:
					"Failed to process request",
			}),
			{
				status: 500,

				headers: {
					...CORS_HEADERS,
					"content-type":
						"application/json; charset=utf-8",
				},
			},
		);

	}

}
