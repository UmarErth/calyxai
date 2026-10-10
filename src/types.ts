export type Plan = 'free' | 'starter' | 'work' | 'unlimited'
export type ModelId = 'core' | 'focus' | 'work' | 'max'
export type Role = 'user' | 'assistant'
export type CalyxTheme = 'light' | 'dark' | 'hacker' | 'midnight' | 'paper'

export interface ResearchSource { title: string; url: string; status: string }
export interface Attachment { id: string; name: string; type: string; size: number; data?: string; preview?: string }
export interface Message { id: string; role: Role; content: string; createdAt: string; attachments?: Attachment[]; sources?: ResearchSource[]; reasoningSummary?: string }
export interface Thread { id: string; title: string; messages: Message[]; imageMode?: boolean; imageTurnsRemaining?: number }
