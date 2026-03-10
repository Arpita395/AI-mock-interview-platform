'use client'

import Image from 'next/image';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useRef} from 'react';
import { createFeedback } from '@/lib/actions/general.action';


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

const Agent= ({userName, userId, type, interviewId, questions}: AgentProps)=> {
    const router= useRouter()
    const recognitionRef = useRef<any>(null);

    const [isSpeaking, setIsSpeaking]= useState(false)
    const [callStatus, setCallStatus]= useState<CallStatus>(CallStatus.INACTIVE)
    const [messages, setMessages]= useState<SavedMessage[]>([])
    const [step, setStep] = useState(0);

    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const questionIndexRef = useRef(0);

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
  }, 400); // small delay 
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


  recognition.onresult = (event: any) => {
  const transcript = event.results[0][0].transcript;

  console.log("User said:", transcript);

  recognition.stop(); // stop immediately to prevent duplicate triggers

  setMessages(prev => [
    ...prev,
    { role: "user", content: transcript }
  ]);

  
  // GENERATE FLOW
  if (type === "generate") {
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

    return;
  }

  
  // INTERVIEW FLOW 
  if(type!== "generate") {
    if(!questions) return 
  }
  const nextIndex = questionIndexRef.current + 1;

  if (nextIndex >= questions.length) {
    finishInterview();
    return;
  }

  questionIndexRef.current = nextIndex;  // update ref FIRST
  setCurrentQuestionIndex(nextIndex);    // update UI

  const acknowledgements = [
    "Thank you for your response.",
    "I appreciate the explanation.",
    "Understood.",
    "That makes sense."
  ];

  const randomAck =
    acknowledgements[Math.floor(Math.random() * acknowledgements.length)];
  speak(randomAck, false);

  setTimeout(() => {
    askInterviewQuestion(nextIndex);
  }, 1200);

  return
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

const finishInterview = () => {
  speak(
    "That concludes our interview. Thank you for your time and thoughtful responses. Our team will review your answers and get back to you soon. Have a great day.",
    false
  );

  setTimeout(() => {
    setCallStatus(CallStatus.FINISHED);
  }, 5000);
};

const askInterviewQuestion = (index: number) => {
  if (!questions || index >= questions.length) {
    finishInterview();
    return;
  }

  const question = questions[index];

  speak(question, true); // speak and then listen
};

const handleCall = () => {
  setCallStatus(CallStatus.CONNECTING);

  if (type === "generate") {
    speak(
      `Hello ${userName}! Let's prepare your interview. I'll ask you a few questions and generate a perfect interview just for you.`,
      true
    );

    setTimeout(() => {
      setStep(1);
    }, 4000);

  } else {
    speak(
      `Hello ${userName}. Thank you for joining today. We will now begin your interview. Please answer each question clearly.`,
      false
    );

    setTimeout(() => {
      questionIndexRef.current=0
      setCurrentQuestionIndex(0);
      askInterviewQuestion(0);
    }, 2500);
  }
};

const handleDisconnect = async () => {
  recognitionRef.current?.stop();
  window.speechSynthesis.cancel();
  setCallStatus(CallStatus.FINISHED);
};

const handleGenerateFeedback= async (messages: SavedMessage[])=> {
  console.log('Generate feedback here.')

  const {success, feedbackId: id}= await createFeedback({
    interviewId: interviewId!,
    userId: userId!,
    transcript: messages
  })

  if(success && id) {
    router.push(`/interview/${interviewId}/feedback`)
  } else {
    console.log('Error saving feedback')
    router.push('/')
  }
}


// redirect when finished
    useEffect(()=> {
      if(callStatus=== CallStatus.FINISHED) {
        if(type=== 'generate') {
          router.push('/')
        } else {
          handleGenerateFeedback(messages)
        }
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
                    <Image src= "/user-avatar.jpg" alt= "user avatar" width= {540} height= {540} className='rounded-full object-cover size-[120px]' />
                    {isSpeaking && <span className='animate-speak' />}
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