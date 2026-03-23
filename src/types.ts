export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: number
}

export interface ChatConfig {
  agentId?: string
  position?: 'bottom-right' | 'bottom-left'
  greeting?: string
  primaryColor?: string
  agentEndpoint?: string
}

export interface QuickReply {
  label: string
  message: string
}
