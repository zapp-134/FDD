import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { SAMPLE_DATA } from '@/data/sampleData';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'assistant';
  timestamp: Date;
}

export const ChatWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: "Hello! I'm your Financial Due Diligence Assistant. I can help you analyze TechCorp's financial data. Try asking about revenue, profitability, red flags, or customer concentration.",
      sender: 'assistant',
      timestamp: new Date()
    }
  ]);
  const [inputText, setInputText] = useState('');

  const findRelevantResponse = (query: string): string => {
    const lowercaseQuery = query.toLowerCase();
    
    // Simple keyword matching for demo
    if (lowercaseQuery.includes('revenue') || lowercaseQuery.includes('sales')) {
      return SAMPLE_DATA.chatResponses.revenue;
    }
    if (lowercaseQuery.includes('profit') || lowercaseQuery.includes('income') || lowercaseQuery.includes('margin')) {
      return SAMPLE_DATA.chatResponses.profit;
    }
    if (lowercaseQuery.includes('red flag') || lowercaseQuery.includes('issue') || lowercaseQuery.includes('concern')) {
      return SAMPLE_DATA.chatResponses['red flags'];
    }
    if (lowercaseQuery.includes('cash') || lowercaseQuery.includes('flow') || lowercaseQuery.includes('working capital')) {
      return SAMPLE_DATA.chatResponses['cash flow'];
    }
    if (lowercaseQuery.includes('customer') || lowercaseQuery.includes('concentration') || lowercaseQuery.includes('client')) {
      return SAMPLE_DATA.chatResponses.customers;
    }
    
    return SAMPLE_DATA.chatResponses.default;
  };

  const handleSendMessage = () => {
    if (!inputText.trim()) return;

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputText,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);

    // Simulate AI response after a short delay
    setTimeout(() => {
      const response = findRelevantResponse(inputText);
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: response,
        sender: 'assistant',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, assistantMessage]);
    }, 800);

    setInputText('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const samplePrompts = [
    "What are the main red flags?",
    "Analyze revenue trends",
    "Customer concentration risk?",
    "Cash flow concerns?"
  ];

  if (!isOpen) {
    return (
      <div className="fixed bottom-6 right-6 z-50">
        <Button
          onClick={() => setIsOpen(true)}
          className="w-14 h-14 rounded-full shadow-lg bg-primary hover:bg-primary-hover"
        >
          💬
        </Button>
      </div>
    );
  }

  return (
    <div className="chat-widget">
      {/* Header */}
      <div className="flex justify-between items-center p-4 border-b border-border">
        <div>
          <h3 className="font-semibold">Due Diligence Assistant</h3>
          <p className="text-xs text-muted-foreground">AI-powered analysis</p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsOpen(false)}
          className="h-8 w-8 p-0"
        >
          ✕
        </Button>
      </div>

      {/* Messages */}
      <div className="flex-1 p-4 space-y-4 max-h-64 overflow-y-auto">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`chat-message ${message.sender}`}
          >
            <p className="text-sm">{message.text}</p>
            <p className="text-xs opacity-70 mt-1">
              {message.timestamp.toLocaleTimeString()}
            </p>
          </div>
        ))}
      </div>

      {/* Sample Prompts */}
      {messages.length === 1 && (
        <div className="px-4 pb-2">
          <p className="text-xs text-muted-foreground mb-2">Try asking:</p>
          <div className="flex flex-wrap gap-1">
            {samplePrompts.map((prompt, index) => (
              <Button
                key={index}
                variant="outline"
                size="sm"
                className="text-xs h-6 px-2"
                onClick={() => setInputText(prompt)}
              >
                {prompt}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="p-4 border-t border-border">
        <div className="flex gap-2">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="Ask about financial analysis..."
            className="flex-1 px-3 py-2 text-sm border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <Button
            onClick={handleSendMessage}
            disabled={!inputText.trim()}
            size="sm"
            className="px-3"
          >
            Send
          </Button>
        </div>
      </div>
    </div>
  );
};