/**
 * Native Reverb WS client for cabinet support chat (pusher protocol 7).
 * WS is an accelerator only. Polling fallback remains active.
 */
export type ChatSocketEventHandler = (event: string, data: unknown) => void

function readAuthToken(): string | null {
  const cookieMatch = document.cookie.match(/(?:^|; )velora_at=([^;]+)/)
  const cookieToken = cookieMatch && cookieMatch[1] ? decodeURIComponent(cookieMatch[1]) : null
  return (
    localStorage.getItem('velora:authToken') ||
    localStorage.getItem('token') ||
    localStorage.getItem('authToken') ||
    cookieToken
  )
}

export function createChatSocket(params?: {
  channels?: string[]
  onEvent?: ChatSocketEventHandler
}) {
  const channels = params?.channels ?? []
  const onEvent = params?.onEvent ?? (() => undefined)

  const wsScheme = window.location.protocol === 'https:' ? 'wss' : 'ws'
  const wsUrl =
    wsScheme +
    '://' +
    window.location.host +
    '/reverb/app/dev-key?protocol=7&client=js&version=1.0&flash=false'

  let socket: WebSocket | null = null
  let socketId: string | null = null
  let pingTimer: number | null = null
  let reconnectTimer: number | null = null
  let closedByUser = false
  let reconnectDelay = 2000

  const cleanupTimers = () => {
    if (pingTimer !== null) {
      window.clearInterval(pingTimer)
      pingTimer = null
    }
  }

  const subscribe = async (channel: string) => {
    try {
      const token = readAuthToken()
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      }
      if (token) headers.Authorization = `Bearer ${token}`

      const response = await fetch('/api/broadcasting/auth', {
        method: 'POST',
        headers,
        body: JSON.stringify({ channel_name: channel, socket_id: socketId }),
      })
      if (!response.ok) return

      const payload = await response.json()
      const auth = payload && typeof payload.auth === 'string' ? payload.auth : null
      if (!auth || !socket || socket.readyState !== WebSocket.OPEN) return

      socket.send(
        JSON.stringify({
          event: 'pusher:subscribe',
          data: { channel, auth },
        }),
      )
    } catch {
      // silent fallback: polling remains active
    }
  }

  const scheduleReconnect = () => {
    if (closedByUser || reconnectTimer !== null) return

    reconnectTimer = window.setTimeout(() => {
      reconnectTimer = null
      reconnectDelay = Math.min(reconnectDelay * 2, 30000)
      connect()
    }, reconnectDelay)
  }

  const connect = () => {
    if (closedByUser) return

    try {
      socket = new WebSocket(wsUrl)
    } catch {
      scheduleReconnect()
      return
    }

    socket.addEventListener('open', () => {
      reconnectDelay = 2000
      pingTimer = window.setInterval(() => {
        if (!socket || socket.readyState !== WebSocket.OPEN) return
        socket.send(JSON.stringify({ event: 'pusher:ping', data: {} }))
      }, 25000)
    })

    socket.addEventListener('message', (raw) => {
      try {
        const packet = JSON.parse(raw.data) as { event?: string; data?: unknown }

        if (packet.event === 'pusher:connection_established') {
          const conn =
            typeof packet.data === 'string'
              ? (JSON.parse(packet.data) as { socket_id?: string })
              : ((packet.data ?? {}) as { socket_id?: string })
          socketId = conn.socket_id ?? null
          channels.forEach((ch) => {
            void subscribe(ch)
          })
          return
        }

        if (packet.event === 'pusher:pong') return
        if (typeof packet.event === 'string' && packet.event.startsWith('pusher_internal:')) return

        let data = packet.data
        if (typeof data === 'string') {
          try {
            data = JSON.parse(data)
          } catch {
            // keep raw string
          }
        }

        onEvent(packet.event ?? '', data)
      } catch {
        // malformed packet
      }
    })

    socket.addEventListener('close', () => {
      cleanupTimers()
      scheduleReconnect()
    })

    socket.addEventListener('error', () => {
      try {
        socket?.close()
      } catch {
        // noop
      }
    })
  }

  connect()

  return {
    close() {
      closedByUser = true
      cleanupTimers()
      if (reconnectTimer !== null) {
        window.clearTimeout(reconnectTimer)
        reconnectTimer = null
      }
      if (socket && socket.readyState <= WebSocket.OPEN) {
        try {
          socket.close()
        } catch {
          // noop
        }
      }
    },
  }
}
