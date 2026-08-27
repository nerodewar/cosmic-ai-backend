/**
 * Cosmic AI Backend
 *
 * Cloudflare Worker using Workers AI + GLM-4.7-Flash.
 *
 * @license MIT
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
You are COSMOS, an AI presence represented visually
as a luminous orb suspended in deep space.

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
	"Access-Control-Allow-Origin": "*",
	"Access-Control-Allow-Methods": "POST, OPTIONS",
	"Access-Control-Allow-Headers": "Content-Type",
};


// -----------------------------------------
// MAIN WORKER
// -----------------------------------------

export default {

	/**
	 * Main request handler
	 */

	async fetch(
		request: Request,
		env: Env,
		ctx: ExecutionContext,
	): Promise<Response> {

		const url = new URL(request.url);


		// ---------------------------------
		// STATIC ASSETS
		// ---------------------------------

		if (
			url.pathname === "/" ||
			!url.pathname.startsWith("/api/")
		) {
			return env.ASSETS.fetch(request);
		}


		// ---------------------------------
		// CHAT API
		// ---------------------------------

		if (url.pathname === "/api/chat") {

			// Browser CORS preflight
			if (request.method === "OPTIONS") {

				return new Response(null, {
					status: 204,
					headers: CORS_HEADERS,
				});

			}


			// Chat request
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


		// ---------------------------------
		// 404
		// ---------------------------------

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
// CHAT HANDLER
// -----------------------------------------

async function handleChatRequest(
	request: Request,
	env: Env,
): Promise<Response> {

	try {

		// Parse JSON sent by frontend
		const { messages = [] } =
			(await request.json()) as {
				messages: ChatMessage[];
			};


		// ---------------------------------
		// BASIC VALIDATION
		// ---------------------------------

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


		// ---------------------------------
		// SYSTEM PROMPT
		// ---------------------------------

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


		// ---------------------------------
		// CALL GLM
		// ---------------------------------

		const result = await env.AI.run(
			MODEL_ID,
			{
				messages,
				max_tokens: 1024,
			},
		);


		// ---------------------------------
		// RETURN JSON
		// ---------------------------------

		return new Response(
			JSON.stringify(result),
			{
				status: 200,

				headers: {
					...CORS_HEADERS,
					"content-type":
						"application/json; charset=utf-8",
				},
			},
		);

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
