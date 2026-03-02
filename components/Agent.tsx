'use client'

import Image from 'next/image';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useRef, use } from 'react';

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

enum CallStatus {
    INACTIVE= 'INACTIVE',
    CONNECTING= 'CONNECTING',
    ACTIVE= 'ACTIVE',
    FINISHED= 'FINISHED'
}

interface SavedMessage {
    role: 'user' | 'system' | 'assistant'
    content: string
}

const Agent= ({userName, userId, type}: AgentProps)=> {
    const router= useRouter()
    const recognitionRef = useRef<any>(null);

    const [isSpeaking, setIsSpeaking]= useState(false)
    const [callStatus, setCallStatus]= useState<CallStatus>(CallStatus.INACTIVE)
    const [messages, setMessages]= useState<SavedMessage[]>([])
    const [step, setStep] = useState(0);

    const [interviewData, setInterviewData] = useState({
    role: "",
    type: "",
    level: "",
    techstack: "",
    amount: ""
    });


    // speak function
  const speak = (text: string, shouldListen = false) => {
  const synth = window.speechSynthesis;
  const utterance = new SpeechSynthesisUtterance(text);

  // Add AI message to transcript
  setMessages(prev => [
    ...prev,
    { role: 'assistant', content: text }
  ]);

  utterance.onstart = () => setIsSpeaking(true);

  utterance.onend = () => {
    setIsSpeaking(false);

    if (shouldListen) {
      startListening();
    }
  };

  synth.speak(utterance);
};

const startListening = () => {
  if (!recognitionRef.current) return;

  try {
    recognitionRef.current.abort(); // force reset
  } catch {}

  setTimeout(() => {
    try {
      recognitionRef.current.start();
    } catch (err) {
      console.log("Restart blocked:", err);
    }
  }, 400); // small delay is important
};


    // speech recognition setup
    useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

        if (!SpeechRecognition) {
            console.log("Speech Recognition not supported");
            return;
        }

  const recognition = new SpeechRecognition();
  recognition.lang = "en-US";
  recognition.interimResults = false;
  recognition.continuous = true;

  recognition.onstart = () => {
  console.log("🎤 Listening...");
  setCallStatus(CallStatus.ACTIVE);
};

const handleUserSentence = async (sentence: string) => {
    const res = await fetch("/api/voice/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sentence }),
    });

    const data = await res.json();

    if (data.success) {
        setInterviewData(prev => ({
            ...prev,
            role: data.data.role || prev.role,
            type: data.data.type || prev.type,
            level: data.data.level || prev.level,
            techstack: data.data.techstack || prev.techstack,
            amount: data.data.amount || prev.amount
        }));

    } else {
        console.log("FULL RESPONSE: ", data);
    }
};


  recognition.onresult = (event: any) => {
  const transcript = event.results[0][0].transcript;

  console.log("User said:", transcript);

  // handleUserSentence(transcript);

  setMessages(prev => [
    ...prev,
    { role: "user", content: transcript }
  ]);

  recognition.stop();

  setTimeout(() => {
    setStep(prevStep => {
      if (prevStep === 1) {
        setInterviewData(prev => ({ ...prev, role: transcript }));
        return 2;
      }
      if (prevStep === 2) {
        setInterviewData(prev => ({ ...prev, type: transcript }));
        return 3;
      }
      if (prevStep === 3) {
        setInterviewData(prev => ({ ...prev, level: transcript }));
        return 4;
      }
      if (prevStep === 4) {
        setInterviewData(prev => ({ ...prev, techstack: transcript }));
        return 5;
      }
      if (prevStep === 5) {
        setInterviewData(prev => ({ ...prev, amount: transcript }));
        return 6;
      }
      return prevStep;
    });
  }, 300);
};

  recognition.onerror = (event: any) => {
    console.log("Speech error:", event.error);
  };

  recognition.onend = () => {
  console.log("Recognition ended");
};

  recognitionRef.current = recognition;
}, []);

// step flow
useEffect(() => {

  if (step === 1) {
    speak("For which role do you want to generate the interview?", true);
  }

  if (step === 2) {
    speak("What type of interview do you want? Technical, behavioural or mixed?", true);
  }

  if (step === 3) {
    speak("What is the experience level? Junior, mid or senior?", true);
  }

  if (step === 4) {
    speak("What tech stack should I focus on?", true);
  }

  if (step === 5) {
    speak("How many questions do you want?", true);
  }

  if (step === 6) {
    generateInterview();
  }

}, [step]);


// generate interview function
const generateInterview = async () => {
  speak("Generating your interview. Please wait.");

  try {
    const res = await fetch("/api/voice/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...interviewData,
        userid: userId,   
      }),
    });

    const data = await res.json();

    speak("Your interview has been successfully generated. Thank you for the call.");

    setTimeout(() => {
      setCallStatus(CallStatus.FINISHED);
    }, 5000);

  } catch (error) {
    console.log(error);
  }
};

// call handlers
const handleCall = () => {
  setCallStatus(CallStatus.CONNECTING);

  speak(
    `Hello ${userName}! Let's prepare your interview. I'll ask you a few questions and generate a perfect interview just for you.`,
    true // ✅ START LISTENING AFTER INTRO
  );

  setTimeout(() => {
    setStep(1);
  }, 4000);
};


const handleDisconnect = async () => {
  recognitionRef.current?.stop();
  window.speechSynthesis.cancel();
  setCallStatus(CallStatus.FINISHED);
};


// redirect when finished
    useEffect(()=> {
      if(callStatus=== CallStatus.FINISHED) {
        router.push('/')
      }
    }, [messages, callStatus, userId])

    
    const latestMessage= messages[messages.length - 1]?.content
    const isCallInactiveOrFinished= callStatus=== CallStatus.INACTIVE || callStatus=== CallStatus.FINISHED

    return (
    <>
        <div className='call-view'>
            <div className='card-interviewer'>
                <div className='avatar'>
                    <Image src= "/ai-avatar.png" alt= "vapi" width= {65} height= {54} className='object-cover' />
                    {isSpeaking && <span className='animate-speak' />}
                </div>
                <h3>AI Interviewer</h3>
            </div>

            <div className='card-border'>
                <div className='card-content'>
                    <Image src= "/user-avatar.png" alt= "user avatar" width= {540} height= {540} className='rounded-full object-cover size-[120px]' />
                    <h3>{userName}</h3>
                </div>
            </div>
        </div>

        {messages.length > 0 && (
  <div className='transcript-border'>
    <div className='transcript'>
      <p key={latestMessage}>
        {latestMessage}
      </p>
    </div>
  </div>
)}


        <div className='w-full flex justify-center'>
            {callStatus!== 'ACTIVE' ? (
                <button className='relative btn-call' onClick= {handleCall}>
                    <span className={cn('absolute animate-ping rounded-full opacity-75', callStatus!=='CONNECTING' && 'hidden')} />
                    
                    <span>
                {isCallInactiveOrFinished ? 'Call' : '. . .'} 
                    </span>
                </button>
            ): (
                <button className='btn-disconnect' onClick= {handleDisconnect}>
                    End
                </button>
            )}
        </div>
    </>
    )
}

export default Agent