import { generateObject, generateText } from "ai";
import {z} from "zod";
import { getRandomInterviewCover } from "@/lib/utils";
import { db } from "@/firebase/admin";
import { createOpenAI } from "@ai-sdk/openai";

export async function GET() {
    return Response.json({success: true, data: 'Thank you'}, {status: 200});
}

const openrouter = createOpenAI({
  apiKey: process.env.OPENROUTER_API_KEY!,
  baseURL: "https://openrouter.ai/api/v1",
});


export async function POST(request: Request) {
    const {type, role, level, techstack, amount, userid}= await request.json()

    try {

    console.log("OPENROUTER:", process.env.OPENROUTER_API_KEY);

    const { object } = await generateObject({
        model: openrouter('openai/gpt-4o-mini'), 
        schema: z.object({
            questions: z.array(z.string())
        }),
        prompt: `Prepare questions for a job interview.
        The job role is ${role}.
        The job experience level is ${level}.
        The tech stack used in the job is: ${techstack}.
        The focus between behavioural and technical questions should lean towards: ${type}.
        The amount of questions required is: ${amount}.
        Please return only the questions.
        `
    })

        const interview= {
            role, type, level,
            techstack: techstack.split(','),
            questions: object.questions,
            userId: userid,
            finalized: true,
            coverImage: getRandomInterviewCover(),
            createdAt: new Date().toISOString()
        }

        await db.collection("interviews").add(interview)

        return Response.json({success: true}, {status: 200})
    } catch (error) {
        console.log(error)

        return Response.json({success: false, error}, {status: 500})
    }
}