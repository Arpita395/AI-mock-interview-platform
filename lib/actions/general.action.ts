'use server'

import { feedbackSchema } from "@/constants"
import { db } from "@/firebase/admin"
import { createOpenAI } from "@ai-sdk/openai"
import { generateText } from "ai"


export async function getInterviewsByUserId(userId: string): Promise<Interview[] | null> {
    if(!userId) return []
    const interviews= await db
    .collection('interviews')
    .where('userId', '==', userId)
    .orderBy('createdAt', 'desc')
    .get()

    return interviews.docs.map((doc)=> ({
        id: doc.id,
        ...doc.data()
    })) as Interview[]
}

export async function getLatestInterviews(params: GetLatestInterviewsParams): Promise<Interview[] | null> {
    const {userId, limit=20}= params
    
    const interviews= await db
    .collection('interviews')
    .orderBy('createdAt', 'desc')
    .where('finalized', '==', true)
    .where('userId', '!=', userId)
    .limit(limit)
    .get()

    return interviews.docs.map((doc)=> ({
        id: doc.id,
        ...doc.data()
    })) as Interview[]
}

export async function getInterviewById(id: string): Promise<Interview | null> {    
    const interview= await db
    .collection('interviews')
    .doc(id)
    .get()

    return interview.data() as Interview | null
}

export async function createFeedback(params: CreateFeedbackParams) {
  const { interviewId, userId, transcript } = params;

  try {
    const formattedTranscript = transcript
      .map((sentence: { role: string; content: string }) =>
        `-${sentence.role}: ${sentence.content}\n`
      )
      .join("");

    const openrouter = createOpenAI({
      apiKey: process.env.OPENROUTER_API_KEY!,
      baseURL: "https://openrouter.ai/api/v1",
    });

    const { text } = await generateText({
  model: openrouter("openai/gpt-4o-mini"),
  system: "You are a professional interviewer analyzing a mock interview. Your task is to evaluate the candidate based on structured categories",

  prompt: `
You must return ONLY valid JSON.

JSON structure:
{
 "totalScore": number,
 "categoryScores": [
   { "name": "Communication Skills", "score": number, "comment": string },
   { "name": "Technical Knowledge", "score": number, "comment": string },
   { "name": "Problem Solving", "score": number, "comment": string },
   { "name": "Cultural Fit", "score": number, "comment": string },
   { "name": "Confidence and Clarity", "score": number, "comment": string }
 ],
 "strengths": string[],
 "areasForImprovement": string[],
 "finalAssessment": string
}

Now perform the evaluation using the instructions below.

You are an AI interviewer analyzing a mock interview. Your task is to evaluate the candidate based on structured categories. Be thorough and detailed in your analysis. Don't be lenient with the candidate. If there are mistakes or areas for improvement, point them out.

Transcript:
${formattedTranscript}

Please score the candidate from 0 to 100 in the following areas. Do not add categories other than the ones provided:

- Communication Skills: Clarity, articulation, structured responses.
- Technical Knowledge: Understanding of key concepts for the role.
- Problem-Solving: Ability to analyze problems and propose solutions.
- Cultural & Role Fit: Alignment with company values and job role.
- Confidence & Clarity: Confidence in responses, engagement, and clarity.

Return ONLY JSON. Do not include explanation or markdown.
`
});

    const parsed = feedbackSchema.parse(JSON.parse(text));

    const {
      totalScore,
      categoryScores,
      strengths,
      areasForImprovement,
      finalAssessment,
    } = parsed;

    const feedback = await db.collection("feedback").add({
      interviewId,
      userId,
      totalScore,
      categoryScores,
      strengths,
      areasForImprovement,
      finalAssessment,
      createdAt: new Date().toISOString(),
    });

    return {
      success: true,
      feedbackId: feedback.id,
    };

  } catch (e) {
    console.error("Error saving feedback", e);

    return { success: false };
  }
}

export async function getFeedbackByInterviewId(params: GetFeedbackByInterviewIdParams): Promise<Feedback | null> {
    const {interviewId, userId}= params

    if (!interviewId || !userId) {
    return null
    }
    
    const feedback= await db
    .collection('feedback')
    .where('interviewId', '==', interviewId)
    .where('userId', '==', userId)
    .limit(1)
    .get()

    if(feedback.empty) return null

    const feedbackDoc= feedback.docs[0]

    return {
        id: feedbackDoc.id, ...feedbackDoc.data()
    } as Feedback
}