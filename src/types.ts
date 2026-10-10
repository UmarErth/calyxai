export type Plan = 'free' | 'starter' | 'work' | 'unlimited'
export type ModelId = 'core' | 'focus' | 'work' | 'max'
export type Role = 'user' | 'assistant'

export interface Message { id: string; role: Role; content: string; createdAt: string }
export interface Thread { id: string; title: string; messages: Message[] }
