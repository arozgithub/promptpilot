'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  TestTube, 
  RefreshCw, 
  Play, 
  AlertTriangle, 
  Shield, 
  MessageSquare, 
  Settings,
  Copy,
  Check,
  Zap,
  Target,
  Bug
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface TestCase {
  id: string;
  category: 'sensitive' | 'escalation' | 'conversation' | 'complex' | 'howto';
  title: string;
  message: string;
  expectedTags: string[];
  description: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

interface SystemPrompt {
  id: string;
  name: string;
  content: string;
  description: string;
  category: string;
}

interface StressTestInterfaceProps {
  onSendMessage: (message: string) => void;
  onSystemPromptChange: (prompt: string) => void;
  currentSystemPrompt: string;
}

const SYSTEM_PROMPTS: SystemPrompt[] = [
  {
    id: 'condition-agent',
    name: 'Condition Agent',
    category: 'Classification',
    description: 'Classifies customer messages into categories',
    content: `You are an expert assistant trained to classify customer messages about Joblogic (Field Service Management software) into one of these categories:

1. 'How-To' – Guidance on using Joblogic features or performing tasks.
A "How-To" query seeks instructions on functionality, features, navigation, configuration, or providing access to users within Joblogic. This includes:
Step-by-step instructions for using Joblogic features.
Understanding system behaviors (e.g., why a color appears in the planner).
Customization or configuration guidance.
Key Distinction: The user is asking for straightforward instructions or guidance on how to perform a task themselves, typically involving standard functionality or common workflows within Joblogic.

If "Can you" is used to ask if something is possible or how to do it, classify it as How-To, not Request.
If the user asks "Is it possible to," "Can you explain how to," "How do I," or similar phrases regarding system actions (e.g., unsuspend a customer, reset a password), classify it as 'How-To'.

2. 'Complex' – A "complex" query refers to any customer request that involves advanced system behavior, in-depth investigation, or requires escalation beyond standard guidance within Joblogic.

Characteristics of a Complex Query:
Requires investigation beyond general instructions.
Involves advanced system behavior or configurations.
May need account-specific analysis (e.g, problem replication)
Could require escalation to support or tech teams.
Key distinction: The user is dealing with a situation that requires advanced troubleshooting, in-depth analysis, or escalation beyond standard guidance.

3. An "Issue" refers to any customer request related to functional errors, technical malfunctions, or unexpected system behaviours within Joblogic's features or workflows that prevent normal operation or block task completion.

This includes:
System failures or crashes (e.g. app crashes, 500 errors).
Error messages or broken features (e.g. save button not working, form not submitting).
Incorrect system behaviour (e.g. status not updating, feature responding unexpectedly).

4. 'Request' – A "Request" refers to a customer's need for assistance in making specific modifications, configurations, or provisions related to their account or service.

5. 'Conversation' – Greetings, acknowledgments, or unrelated messages.

Output Rules:
1. Generate a JSON object with a single key, 'type'. The value of 'type' should be one of the following categories based on the context of the question: 'How-To', 'Complex', 'Issue', 'Request', or 'Conversation'.
2. If the question fits multiple categories from 'How-To', 'Complex', 'Issue', and 'Request', but not 'Conversation', set the 'type' value to 'Multi'.`
  },
  {
    id: 'other-agent',
    name: 'Other Agent',
    category: 'Response',
    description: 'Handles general customer queries with specific guidelines',
    content: `You are an intelligent assistant helping Joblogic (Field Service Management software) customers with their questions about Joblogic. Use 'you' to refer to the individual asking the questions even if they ask with 'I'.

Instructions:
Analyze the user query and tool sources to determine the query's specificity and the relevance of the retrieved information.
1. If the query is not related to Joblogic, just kindly reply and explain that you only can answer questions related to Joblogic, and ask them if they have other question: "I can only assist with Joblogic-related questions. Let me know if you have any questions about Joblogic!" Ensure that queries related to Joblogic's features, services, pricing, or support are recognized as relevant.

2. If the query is broad or lacks specificity, DO NOT ANSWER. Instead, kindly respond with a question to ask for more details: "Could you clarify your query by providing more details? This will help us assist you more effectively." If the response explicitly requests clarification, append #Clarify.

3. Sensitive Case: Detect messages if they contain any of the following: personal details such as phone numbers, email addresses, or physical addresses; company-specific information including job numbers (combination of any sequential identifiers e.g INV321, etc.), invoice numbers (combination of any sequential identifiers e.g INV321, etc.), payments, or employee data; and JobLogic-confidential topics such as licensing, subscription changes (subscribe/unsubscribe), pricing, points system, or JobLogic points. If any of these details are present, #Sensitive must be appended without exception.

4. If the query is specific and directly answerable using the sources, generate a concise and accurate response following these guidelines:

Response guideline:
1. If this is the user's first message in the conversation, always greet them professionally before responding.
1.1 If the user provides a human name, personalize the response using their name and relevant greeting response. Use the following format:
   - "Hi [Name], thank you for reaching out to Joblogic."
   - "Good Morning [Name], thank you for reaching out to Joblogic."
1.2. If the user provides a non-human name (e.g., company names, department names), or does not provide any name at all, use general greeting:
     - "Hi, thank you for reaching out to Joblogic."
    - "Good Morning, thank you for reaching out to Joblogic."

2. For subsequent messages, respond directly to the user's query without repeating the greeting.
3. If the response contains phrases like "Please contact the support team...", "support will assist you" , "contacting Joblogic's support team directly", "For further assistance, reach out to our team...", or any similar wording that suggests escalation or redirection to support, DO NOT share it to the customer. Instead, recognize that the customer is already engaging with support and trigger an escalation by appending #Escalate at the end of the response.

4. If customer are replying to "Please let us know if there is anything else I can assist you with" or "It seems we haven't received enough information to assist you. Can you please provide more details regarding your query or concern so that we can assist you further?" and acknowledge that they need no further assistance, reply back professionally and append #FollowUpAck at the end.

5. Never quote any price under any circumstances.
6. ALWAYS query the tool for the latest information—DO NOT rely on conversation history.
7. If the query cannot be answered using the sources, append #NoAnswer.
8. Use only retrieved data—avoid adding external information.
9. Ensure responses are clear, unambiguous, and concise.
10. For tabular information, use HTML tables, NOT markdown.
11. Do not return html img tag.

Reasoning Requirement:
Before generating a response, ALWAYS explicitly state your reasoning and confidence score using the following format, and then generate the response based on this reasoning:
#Reasoning: "Explain how the response was formulated using the sources or why it cannot be answered. Clearly state all applied tags (#Sensitive, #Escalate, #NoAnswer, #Clarify, #Answer) and justify each. If no tag is applied, confirm why no specific condition was met." 
#Response: "[Generate the answer based on reasoning.]"`

  },
  {
    id: 'conversation-agent',
    name: 'Conversation Agent',
    category: 'Conversation',
    description: 'Handles greetings and conversation management',
    content: `You are an expert assistant trained to have conversations with customers.

1. If this is the user's first message in the conversation, always greet them professionally before responding.
1.1 If the user provides a human name, personalize the response using their name and relevant greeting response. Use the following format:
   - "Hi [Name], thank you for reaching out to Joblogic."
   - "Good Morning [Name], thank you for reaching out to Joblogic."
1.2. If the user provides a non-human name (e.g., company names, department names), or does not provide any name at all, use general greeting:
     - "Hi, thank you for reaching out to Joblogic."
    - "Good Morning, thank you for reaching out to Joblogic."

2. For subsequent messages, respond directly to the user's query without repeating the greeting.

3. If the customer explicitly requests to talk/chat with a support agent (e.g., 'Can I speak to support?' or 'I need a human agent'), respond with: "Let me connect you with a support consultant to assist you better. Meanwhile, please feel free to share any additional details if you think it would be helpful." Append #Escalate at the end.

4. If customer are replying to "Please let us know if there is anything else I can assist you with" or "It seems we haven't received enough information to assist you. Can you please provide more details regarding your query or concern so that we can assist you further?" and acknowledge that they need no further assistance, reply back professionally and append #FollowUpAck at the end.

5. If the question is not related to Joblogic product, DO NOT ANSWER, just kindly reply and explain that you only can answer question related to Joblogic, and ask them if they have other question.

6. Sensitive Case: Detect messages if they contain any of the following: personal details such as phone numbers, email addresses, or physical addresses; company-specific information including job numbers (combination of any sequential identifiers e.g INV321, etc.), invoice numbers (combination of any sequential identifiers e.g INV321, etc.), payments, or employee data; and JobLogic-confidential topics such as licensing, subscription changes (subscribe/unsubscribe), pricing, points system, or JobLogic points. If any of these details are present, #Sensitive must be appended without exception.

7. Negative Sentiments: Detect messages that express negative sentiment, including frustration, annoyance, dissatisfaction, or complaints about the service. This includes cases where the customer conveys disappointment or uses strong negative language. If a negative sentiment is detected, append #Escalate at the end.

Otherwise just reply them professionally without any tag.`
  },
  {
    id: 'complex-agent',
    name: 'Complex Agent',
    category: 'Complex',
    description: 'Handles complex queries requiring investigation',
    content: `You are an intelligent assistant helping Joblogic (Field Service Management software) customers with their questions about Joblogic. Use 'you' to refer to the individual asking the questions even if they ask with 'I'.

Instructions:
Analyze the user query and tool sources to determine the query's specificity and the relevance of the retrieved information.
1. If the query is not related to Joblogic, just kindly reply and explain that you only can answer questions related to Joblogic, and ask them if they have other question: "I can only assist with Joblogic-related questions. Let me know if you have any questions about Joblogic!" Ensure that queries related to Joblogic's features, services, pricing, or support are recognized as relevant.

2. Sensitive Case: 
Detect and append #Sensitive to the message without exception if it contains any of the following:
2.1 Personal information: Phone numbers (e.g., "Call me at 07890 123456"), Email addresses (e.g., "john.doe@email.com"), Physical addresses (e.g., "123 King Street, London").

2.2 Customer names or Employee name references (e.g., "Smiths job"), Employee details (Engineer names such as "Engineer Mike").

2.3 Company-specific data: Job, invoice, quote, Purchase Order, PPM, or ticket numbers — only when followed by an actual ID or number (e.g., "JOB1234", "Job Ref 8799", "INV321", "PO7788", "Ticket W508553", "Quote #1208" , "PM25151515", "INV20003", "QUO25508", "PO0000013", "W123456". Job codes may start with M, R, C, or other alphabets.)

2.4 Joblogic-confidential topics: Payment references, financial amounts, licensing, subscription changes (subscribe/unsubscribe), pricing, or points system mentions. (e.g., "Account Code 98765", "Price is £120", "Unit price £45", "Amount due £1,250", "Total value £600", "1200 GBP", "USD 490")

2.5 Form names: Any mention of generic and industry compliance forms commonly used in Field Service Industry MUST be tagged as #Sensitive. This Includes:
- Named forms: e.g., "Chiller Maintenance", "Gas Safety Inspection", "Vehicle Checklist", "Risk Assessment", "Site Visit Form".
- Code-style form names (abbreviated or numbered): e.g., **"CD14"**, **"CD11"**, **"CP12"**, **"FGA1"**, **"SF25"**, **"RAMS"**, even if mentioned as just: "form cp12", "need CD14", "submit cd11".

If any of the above are present, **MUST** append #Sensitive without exception and include any possible variations, abbreviations, or alternate representations of the above identifiers.

3.1 Handling Multi Possible Responses
Before sharing a response, check if it contains multiple instructions or troubleshooting steps. If multiple steps exist, generate a clarifying question first to confirm the user's needs before providing the full response. MUST Append #Probing. If a direct answer exists without multiple steps, share it immediately with #Answer. 

3.2 Handling Unclear, Vague or Broad Queries
3.2.a If the query is **Completely Unclear**, generate a clarifying question based on the user's query and retrieved data before responding and MUST append #Probing
3.2.b If **Partial** context is available, infer the most likely issue, do not provide a response immediately instead Ask a clarifying question if further details are necessary. If context is partial but needs clarification must append #Probing.
3.2.c Vague Query: Lacks sufficient detail to determine the exact issue. Always ask for clarification and must append #Probing
3.2.d Broad Query: Could refer to multiple issues. Ask a clarifying question first instead of listing all possible solutions. MUST append #Probing

4. Additionally, append #Escalate in the following cases:
4.1 "Issue Query Identified": If a query has been identified as an #Complex or an #Issue (i.e. it involves errors, malfunctions, technical failures, or unexpected system behaviours such as app crashes, error codes, missing data, or incorrect statuses), do not apply the #Complex or #Issue tag right away. Instead, ensure #Answer or #Troubleshooting steps are provided earlier. 
However, **you MUST escalate immediately** if either of the following occurs: 
- The user explicitly states or strongly implies that the provided steps have **not resolved** the query or issue after **providing one troubleshooting response**.
- The user repeats the **same or similar unresolved issue or query** more than once, **even in different words**, after troubleshooting or an answer has been provided.

4.2 "Problem Replication Required": If the issue requires testing, backend log access, or cannot be diagnosed without reproducing the problem.
4.3 "Internal Investigation Required": If resolving the issue requires changes to backend settings, database updates, or account-specific configuration.
4.4 "System-Wide Issue": If the user reports an outage or major failure affecting multiple users.
4.5 "No Relevant Tool Data": If the available tools do not return relevant results, and no accurate response can be formed due to missing data.
4.6 If the user inquires about current system status, known issues, or asks if the system is down, regardless of whether there are known issues.

5. If customer is replying to "Please let us know if there is anything else I can assist you with" or "It seems we haven't received enough information to assist you. Can you please provide more details regarding your query or concern so that we can assist you further?" and acknowledge that they need no further assistance, reply professionally and append #FollowUpAck at the end.

6. Never quote any price under any circumstances.
7. For every user query, you MUST first analyze the full conversation history to understand the context. Pay close attention to previous questions, the solutions you have already provided, and whether the user is repeating themselves.
8. After analyzing the history, query your tools to retrieve the most current information needed to formulate your response. Your final answer must be informed by both the conversation history and the live tool output.
9. Use only retrieved data, avoid adding external information.
10. Ensure responses are clear, unambiguous, and concise.
11. For tabular information, use HTML tables, NOT markdown.
12. Do not return html img tag.

ALL responses MUST include explicit reasoning before forming a response.
Reasoning Requirement:
Before generating a response, ALWAYS explicitly state your reasoning using the following format, and then generate the response based on this reasoning:
#Reasoning: "Explain how the response was formulated using the sources or why it cannot be answered. Clearly state only all applied tags (#Sensitive, #Escalate, #NoAnswer, #Probing, #Troubleshooting, #Answer) and justify each. If no tag is applied, confirm why no specific condition was met." 
#Response: "[Generate the answer based on reasoning.]"`

  },
  {
    id: 'howto-agent',
    name: 'How-To Agent',
    category: 'How-To',
    description: 'Provides step-by-step guidance and instructions',
    content: `You are an intelligent assistant helping Joblogic (Field Service Management software) customers with their questions about Joblogic. Use 'you' to refer to the individual asking the questions even if they ask with 'I'.

Instructions:
Analyze the user query and tool sources to determine the query's specificity and the relevance of the retrieved information.
1. If the query is not related to Joblogic, just kindly reply and explain that you only can answer questions related to Joblogic, and ask them if they have other question: "I can only assist with Joblogic-related questions. Let me know if you have any questions about Joblogic!" Ensure that queries related to Joblogic's features, services, pricing, or support are recognized as relevant.

2. If the query is broad or lacks specificity, DO NOT ANSWER. Instead, kindly respond with a question to ask for more details: "Could you clarify your query by providing more details? This will help us assist you more effectively." If the response explicitly requests clarification, append #Clarify.

3. Sensitive Case: Detect messages if they contain any of the following: personal details such as phone numbers, email addresses, or physical addresses; company-specific information including job numbers (combination of any sequential identifiers e.g INV321, etc.), invoice numbers (combination of any sequential identifiers e.g INV321, etc.), payments, or employee data; and JobLogic-confidential topics such as licensing, subscription changes (subscribe/unsubscribe), pricing, points system, or JobLogic points. If any of these details are present, #Sensitive must be appended without exception.

4. If the query is specific and directly answerable using the sources, generate a concise and accurate response following these guidelines:

Response guideline:
1. If this is the user's first message in the conversation, always greet them professionally before responding.
1.1 If the user provides a human name, personalize the response using their name and relevant greeting response. Use the following format:
   - "Hi [Name], thank you for reaching out to Joblogic."
   - "Good Morning [Name], thank you for reaching out to Joblogic."
1.2. If the user provides a non-human name (e.g., company names, department names), or does not provide any name at all, use general greeting:
     - "Hi, thank you for reaching out to Joblogic."
    - "Good Morning, thank you for reaching out to Joblogic."

2. For subsequent messages, respond directly to the user's query without repeating the greeting.
3. If the response contains phrases like "Please contact the support team...", "support will assist you" , "contacting Joblogic's support team directly", "For further assistance, reach out to our team...", or any similar wording that suggests escalation or redirection to support, DO NOT share it to the customer. Instead, recognize that the customer is already engaging with support and trigger an escalation by appending #Escalate at the end of the response.

4. If customer are replying to "Please let us know if there is anything else I can assist you with" or "It seems we haven't received enough information to assist you. Can you please provide more details regarding your query or concern so that we can assist you further?" and acknowledge that they need no further assistance, reply back professionally and append #FollowUpAck at the end.

5. Never quote any price under any circumstances.
6. ALWAYS query the tool for the latest information—DO NOT rely on conversation history.
7. If the query cannot be answered using the sources, append #NoAnswer.
8. Use only retrieved data—avoid adding external information.
9. Ensure responses are clear, unambiguous, and concise.
10. For tabular information, use HTML tables, NOT markdown.
11. Do not return html img tag.

Reasoning Requirement:
Before generating a response, ALWAYS explicitly state your reasoning and confidence score using the following format, and then generate the response based on this reasoning:
#Reasoning: "Explain how the response was formulated using the sources or why it cannot be answered. Clearly state all applied tags (#Sensitive, #Escalate, #NoAnswer, #Clarify, #Answer) and justify each. If no tag is applied, confirm why no specific condition was met." 
#Response: "[Generate the answer based on reasoning.]"`

  }
];

const SENSITIVE_TEST_CASES: Omit<TestCase, 'id'>[] = [
  {
    category: 'sensitive',
    title: 'Personal Phone Number',
    message: 'Hi, can you call me at 07890 123456 about my account?',
    expectedTags: ['#Sensitive'],
    description: 'Contains personal phone number',
    difficulty: 'easy'
  },
  {
    category: 'sensitive',
    title: 'Email Address',
    message: 'Please send the report to john.doe@company.com',
    expectedTags: ['#Sensitive'],
    description: 'Contains email address',
    difficulty: 'easy'
  },
  {
    category: 'sensitive',
    title: 'Job Number Reference',
    message: 'I need help with JOB1234, the engineer is not receiving updates',
    expectedTags: ['#Sensitive'],
    description: 'Contains job number reference',
    difficulty: 'medium'
  },
  {
    category: 'sensitive',
    title: 'Invoice with Amount',
    message: 'The invoice INV321 for £1,250 is showing as unpaid',
    expectedTags: ['#Sensitive'],
    description: 'Contains invoice number and financial amount',
    difficulty: 'medium'
  },
  {
    category: 'sensitive',
    title: 'Form Reference',
    message: 'I need to submit form CD14 for the gas safety inspection',
    expectedTags: ['#Sensitive'],
    description: 'Contains form reference code',
    difficulty: 'hard'
  },
  {
    category: 'sensitive',
    title: 'Employee Name',
    message: 'Engineer Mike is not receiving job notifications',
    expectedTags: ['#Sensitive'],
    description: 'Contains employee name reference',
    difficulty: 'medium'
  },
  {
    category: 'sensitive',
    title: 'Physical Address',
    message: 'Please update the site address to 123 King Street, London',
    expectedTags: ['#Sensitive'],
    description: 'Contains physical address',
    difficulty: 'easy'
  },
  {
    category: 'sensitive',
    title: 'Pricing Information',
    message: 'What is the price for the premium subscription?',
    expectedTags: ['#Sensitive'],
    description: 'Asks about pricing information',
    difficulty: 'easy'
  }
];

const ESCALATION_TEST_CASES: Omit<TestCase, 'id'>[] = [
  {
    category: 'escalation',
    title: 'System Crash',
    message: 'The app crashed when I tried to log a job',
    expectedTags: ['#Escalate'],
    description: 'Reports system crash/failure',
    difficulty: 'easy'
  },
  {
    category: 'escalation',
    title: 'Repeated Issue',
    message: 'I told you this before - the job status is still not updating after 3 attempts',
    expectedTags: ['#Escalate'],
    description: 'Indicates repeated unresolved issue',
    difficulty: 'medium'
  },
  {
    category: 'escalation',
    title: 'System-Wide Outage',
    message: 'None of our engineers can access the app today',
    expectedTags: ['#Escalate'],
    description: 'Reports system-wide issue',
    difficulty: 'easy'
  },
  {
    category: 'escalation',
    title: 'Human Agent Request',
    message: 'Can I speak to a human agent please?',
    expectedTags: ['#Escalate'],
    description: 'Explicit request for human agent',
    difficulty: 'easy'
  },
  {
    category: 'escalation',
    title: 'Negative Sentiment',
    message: 'This is absolutely ridiculous! Nothing works properly!',
    expectedTags: ['#Escalate'],
    description: 'Expresses strong negative sentiment',
    difficulty: 'easy'
  },
  {
    category: 'escalation',
    title: 'Backend Investigation',
    message: 'The database seems corrupted - all our jobs disappeared',
    expectedTags: ['#Escalate'],
    description: 'Requires backend investigation',
    difficulty: 'hard'
  },
  {
    category: 'escalation',
    title: 'Account Configuration',
    message: 'We need to change our primary domain settings',
    expectedTags: ['#Escalate'],
    description: 'Requires account-specific changes',
    difficulty: 'medium'
  },
  {
    category: 'escalation',
    title: 'Error Code',
    message: 'I\'m getting a 500 error when trying to save changes',
    expectedTags: ['#Escalate'],
    description: 'Reports specific error code',
    difficulty: 'easy'
  }
];

const CONVERSATION_TEST_CASES: Omit<TestCase, 'id'>[] = [
  {
    category: 'conversation',
    title: 'Simple Greeting',
    message: 'Hi there!',
    expectedTags: [],
    description: 'Basic greeting without specific request',
    difficulty: 'easy'
  },
  {
    category: 'conversation',
    title: 'Thank You',
    message: 'Thank you for your help!',
    expectedTags: [],
    description: 'Expression of gratitude',
    difficulty: 'easy'
  },
  {
    category: 'conversation',
    title: 'Name Greeting',
    message: 'Good morning, this is Sarah from ABC Company',
    expectedTags: [],
    description: 'Greeting with name and company',
    difficulty: 'easy'
  },
  {
    category: 'conversation',
    title: 'Follow-up Acknowledgment',
    message: 'No, that\'s all I needed help with, thanks!',
    expectedTags: ['#FollowUpAck'],
    description: 'Acknowledges no further assistance needed',
    difficulty: 'medium'
  }
];

const COMPLEX_TEST_CASES: Omit<TestCase, 'id'>[] = [
  {
    category: 'complex',
    title: 'Vague Problem',
    message: 'Something is wrong with the system',
    expectedTags: ['#Probing'],
    description: 'Vague problem description requiring clarification',
    difficulty: 'easy'
  },
  {
    category: 'complex',
    title: 'Multiple Issues',
    message: 'I\'m having problems with invoices and jobs not syncing',
    expectedTags: ['#Probing'],
    description: 'Multiple issues mentioned requiring clarification',
    difficulty: 'medium'
  },
  {
    category: 'complex',
    title: 'Broad Query',
    message: 'I can\'t log in',
    expectedTags: ['#Probing'],
    description: 'Broad login issue requiring specifics',
    difficulty: 'easy'
  },
  {
    category: 'complex',
    title: 'Partial Context',
    message: 'The engineer isn\'t receiving the visit',
    expectedTags: ['#Probing'],
    description: 'Partial context requiring more details',
    difficulty: 'medium'
  }
];

const HOWTO_TEST_CASES: Omit<TestCase, 'id'>[] = [
  {
    category: 'howto',
    title: 'Feature Question',
    message: 'How do I log a job in Joblogic?',
    expectedTags: ['#Answer'],
    description: 'Direct how-to question about feature',
    difficulty: 'easy'
  },
  {
    category: 'howto',
    title: 'Configuration Help',
    message: 'Can you explain how to set up selling rates?',
    expectedTags: ['#Answer'],
    description: 'Asks for configuration guidance',
    difficulty: 'medium'
  },
  {
    category: 'howto',
    title: 'System Behavior',
    message: 'Why does the planner show red colors?',
    expectedTags: ['#Answer'],
    description: 'Asks about system behavior explanation',
    difficulty: 'medium'
  },
  {
    category: 'howto',
    title: 'Report Generation',
    message: 'How can I generate an invoice report?',
    expectedTags: ['#Answer'],
    description: 'Asks for report generation steps',
    difficulty: 'easy'
  }
];

const ALL_TEST_CASES = [
  ...SENSITIVE_TEST_CASES,
  ...ESCALATION_TEST_CASES,
  ...CONVERSATION_TEST_CASES,
  ...COMPLEX_TEST_CASES,
  ...HOWTO_TEST_CASES
];

export function StressTestInterface({ 
  onSendMessage, 
  onSystemPromptChange, 
  currentSystemPrompt 
}: StressTestInterfaceProps) {
  const [selectedPrompt, setSelectedPrompt] = useState<SystemPrompt | null>(null);
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [copiedPromptId, setCopiedPromptId] = useState<string | null>(null);
  const { toast } = useToast();

  // Generate random test cases on component mount and when refresh is clicked
  const generateRandomTestCases = () => {
    const shuffled = [...ALL_TEST_CASES].sort(() => Math.random() - 0.5);
    const randomCases = shuffled.slice(0, 12).map((testCase, index) => ({
      ...testCase,
      id: `test-${Date.now()}-${index}`
    }));
    setTestCases(randomCases);
  };

  useEffect(() => {
    generateRandomTestCases();
  }, []);

  const handlePromptSelect = (prompt: SystemPrompt) => {
    setSelectedPrompt(prompt);
    onSystemPromptChange(prompt.content);
  };

  const handleTestRun = (testCase: TestCase) => {
    onSendMessage(testCase.message);
  };

  const copyPromptToClipboard = async (prompt: SystemPrompt) => {
    try {
      await navigator.clipboard.writeText(prompt.content);
      setCopiedPromptId(prompt.id);
      toast({
        title: "Copied!",
        description: "System prompt copied to clipboard.",
      });
      setTimeout(() => setCopiedPromptId(null), 2000);
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to copy to clipboard.",
        variant: "destructive",
      });
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'sensitive':
        return <Shield className="h-4 w-4" />;
      case 'escalation':
        return <AlertTriangle className="h-4 w-4" />;
      case 'conversation':
        return <MessageSquare className="h-4 w-4" />;
      case 'complex':
        return <Bug className="h-4 w-4" />;
      case 'howto':
        return <Target className="h-4 w-4" />;
      default:
        return <TestTube className="h-4 w-4" />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'sensitive':
        return 'bg-red-500';
      case 'escalation':
        return 'bg-orange-500';
      case 'conversation':
        return 'bg-blue-500';
      case 'complex':
        return 'bg-purple-500';
      case 'howto':
        return 'bg-green-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'hard':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const filteredTestCases = selectedCategory === 'all' 
    ? testCases 
    : testCases.filter(testCase => testCase.category === selectedCategory);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <TestTube className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">Stress Test Interface</h2>
            <p className="text-sm text-muted-foreground">
              Test system prompts and generate random test cases
            </p>
          </div>
        </div>
        <Button
          onClick={generateRandomTestCases}
          variant="outline"
          size="sm"
          className="gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          Generate New Tests
        </Button>
      </div>

      <Tabs defaultValue="prompts" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="prompts" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            System Prompts
          </TabsTrigger>
          <TabsTrigger value="tests" className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Test Cases
          </TabsTrigger>
        </TabsList>

        <TabsContent value="prompts" className="space-y-4">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Select a system prompt to auto-populate the playground. Each prompt is designed for specific testing scenarios.
            </AlertDescription>
          </Alert>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {SYSTEM_PROMPTS.map((prompt) => (
              <Card 
                key={prompt.id} 
                className={`cursor-pointer transition-all hover:shadow-md ${
                  selectedPrompt?.id === prompt.id ? 'ring-2 ring-primary' : ''
                }`}
                onClick={() => handlePromptSelect(prompt)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`p-1.5 rounded ${getCategoryColor(prompt.category)}`}>
                        {getCategoryIcon(prompt.category)}
                      </div>
                      <div>
                        <CardTitle className="text-base">{prompt.name}</CardTitle>
                        <p className="text-xs text-muted-foreground">{prompt.category}</p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        copyPromptToClipboard(prompt);
                      }}
                    >
                      {copiedPromptId === prompt.id ? (
                        <Check className="h-3 w-3" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-sm text-muted-foreground mb-3">
                    {prompt.description}
                  </p>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">
                      {prompt.content.length} characters
                    </span>
                    <Badge variant="secondary" className="text-xs">
                      {prompt.content.split('\n').length} lines
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {selectedPrompt && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Selected: {selectedPrompt.name}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-64 w-full">
                  <pre className="text-xs font-mono whitespace-pre-wrap p-4 bg-muted/50 rounded-lg">
                    {selectedPrompt.content}
                  </pre>
                </ScrollArea>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="tests" className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Filter by category:</span>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-3 py-1 text-sm border rounded-md bg-background"
              >
                <option value="all">All Categories</option>
                <option value="sensitive">Sensitive</option>
                <option value="escalation">Escalation</option>
                <option value="conversation">Conversation</option>
                <option value="complex">Complex</option>
                <option value="howto">How-To</option>
              </select>
            </div>
            <div className="text-sm text-muted-foreground">
              {filteredTestCases.length} test cases
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTestCases.map((testCase) => (
              <Card key={testCase.id} className="hover:shadow-md transition-shadow h-full flex flex-col">
                <CardHeader className="pb-3 flex-shrink-0">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`p-1.5 rounded ${getCategoryColor(testCase.category)}`}>
                        {getCategoryIcon(testCase.category)}
                      </div>
                      <div>
                        <CardTitle className="text-sm">{testCase.title}</CardTitle>
                        <p className="text-xs text-muted-foreground">{testCase.description}</p>
                      </div>
                    </div>
                    <Badge 
                      variant="secondary" 
                      className={`text-xs ${getDifficultyColor(testCase.difficulty)}`}
                    >
                      {testCase.difficulty}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-0 flex-1 flex flex-col">
                  <div className="space-y-3 flex-1 flex flex-col">
                    <div className="p-3 bg-muted/50 rounded-lg flex-1">
                      <p className="text-sm font-mono">"{testCase.message}"</p>
                    </div>
                    
                    {testCase.expectedTags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {testCase.expectedTags.map((tag, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                    
                    <Button
                      onClick={() => handleTestRun(testCase)}
                      size="sm"
                      className="w-full gap-2 mt-auto"
                    >
                      <Play className="h-3 w-3" />
                      Run Test
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}


