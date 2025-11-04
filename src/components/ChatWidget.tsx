/* LABELED_BY_TOOL
 * File: src/components/ChatWidget.tsx
 * Inferred role: Frontend source (React + Vite)
 * Note: auto-generated label. Please edit the file for a more accurate description. */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Send, Minimize2, Maximize2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '@/context/AppContext';

interface ChatMessage {
  id: string;
  question: string;
  answer: string;
  sources: Array<{
    doc: string;
    snippet: string;
  }>;
  timestamp: Date;
}

interface ChatWidgetProps {
  reportId?: string;
}

export const ChatWidget = ({ reportId }: ChatWidgetProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { apiBaseUrl } = useApp();

  const handleSendMessage = async () => {
    if (!currentQuestion.trim()) return;

    const question = currentQuestion;
    setCurrentQuestion('');
    setIsLoading(true);

    try {
      const response = await fetch(`${apiBaseUrl}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          report_id: reportId,
          question: question,
        }),
      });

      const data = await response.json();
      
      const newMessage: ChatMessage = {
        id: Date.now().toString(),
        question,
        answer: data.answer || 'I apologize, but I couldn\'t process your question at this time.',
        sources: data.sources || [],
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, newMessage]);
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: ChatMessage = {
        id: Date.now().toString(),
        question,
        answer: 'Sorry, there was an error processing your question. Please try again.',
        sources: [],
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <>
      {/* Chat Toggle Button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="fixed bottom-4 right-4 z-50"
          >
            <Button
              onClick={() => setIsOpen(true)}
              size="lg"
              className="rounded-full h-14 w-14 shadow-lg hover:shadow-xl"
            >
              <MessageSquare className="h-6 w-6" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 100, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 100, scale: 0.9 }}
            className="fixed bottom-4 right-4 z-50"
          >
            <Card className={`w-96 shadow-2xl ${isMinimized ? 'h-14' : 'h-96'} transition-all duration-300`}>
              <CardHeader className="pb-2 px-4 py-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    AI Assistant
                  </CardTitle>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={() => setIsMinimized(!isMinimized)}
                    >
                      {isMinimized ? <Maximize2 className="h-3 w-3" /> : <Minimize2 className="h-3 w-3" />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={() => setIsOpen(false)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </CardHeader>

              {!isMinimized && (
                <CardContent className="p-0 flex flex-col h-80">
                  {/* Messages */}
                  <ScrollArea className="flex-1 px-4">
                    <div className="space-y-4 pb-4">
                      {messages.length === 0 && (
                        <div className="text-center text-sm text-muted-foreground py-8">
                          <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          <p>Ask me anything about the financial data!</p>
                        </div>
                      )}
                      
                      {messages.map((message) => (
                        <div key={message.id} className="space-y-2">
                          {/* Question */}
                          <div className="flex justify-end">
                            <div className="bg-primary text-primary-foreground rounded-lg px-3 py-2 max-w-xs text-sm">
                              {message.question}
                            </div>
                          </div>
                          
                          {/* Answer */}
                          <div className="flex justify-start">
                            <div className="bg-muted rounded-lg px-3 py-2 max-w-xs">
                              <p className="text-sm">{message.answer}</p>
                              
                              {/* Sources */}
                              {message.sources.length > 0 && (
                                <div className="mt-2 space-y-1">
                                  <p className="text-xs font-medium">Sources:</p>
                                  {message.sources.map((source, index) => (
                                    <div key={index} className="text-xs">
                                      <Badge variant="outline" className="text-xs">
                                        {source.doc}
                                      </Badge>
                                      <p className="text-muted-foreground mt-1">{source.snippet}</p>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}

                      {isLoading && (
                        <div className="flex justify-start">
                          <div className="bg-muted rounded-lg px-3 py-2">
                            <div className="flex items-center gap-1">
                              <div className="animate-pulse-subtle">●</div>
                              <div className="animate-pulse-subtle" style={{ animationDelay: '0.2s' }}>●</div>
                              <div className="animate-pulse-subtle" style={{ animationDelay: '0.4s' }}>●</div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </ScrollArea>

                  {/* Input */}
                  <div className="p-4 border-t">
                    <div className="flex items-center gap-2">
                      <Input
                        placeholder="Ask about the financial data..."
                        value={currentQuestion}
                        onChange={(e) => setCurrentQuestion(e.target.value)}
                        onKeyPress={handleKeyPress}
                        disabled={isLoading}
                        className="flex-1"
                      />
                      <Button
                        size="sm"
                        onClick={handleSendMessage}
                        disabled={!currentQuestion.trim() || isLoading}
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};