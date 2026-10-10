export type Plan = 'free' | 'starter' | 'work' | 'unlimited'
export type ModelId = 'core' | 'focus' | 'work' | 'max'
export type Role = 'user' | 'assistant'

export interface ResearchSource { title: string; url: string; status: string }
export interface Message { id: string; role: Role; content: string; createdAt: string; sources?: ResearchSource[]; reasoningSummary?: string }
export interface Thread { id: string; title: string; messages: Message[] }
