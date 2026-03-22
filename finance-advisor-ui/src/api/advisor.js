const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

// Streaming chat using native fetch (not axios) to handle ReadableStream
export const streamChat = async (message, onChunk, onDone, onError) => {
  const token = localStorage.getItem('token')

  try {
    const response = await fetch(`${API_URL}/advisor/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ message }),
    })

    if (!response.ok) {
      if (response.status === 401) {
        localStorage.removeItem('token')
        window.location.href = '/login'
        return
      }
      throw new Error(`HTTP error ${response.status}`)
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      const chunk = decoder.decode(value, { stream: true })
      onChunk(chunk)
    }

    onDone()
  } catch (err) {
    onError(err)
  }
}
