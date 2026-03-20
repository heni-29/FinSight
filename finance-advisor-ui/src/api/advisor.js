// Streaming chat using native fetch (not axios) to handle ReadableStream
export const streamChat = async (message, onChunk, onDone, onError) => {
  const token = localStorage.getItem('finsight_token')

  try {
    const response = await fetch('/advisor/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ message }),
    })

    if (!response.ok) {
      if (response.status === 401) {
        localStorage.removeItem('finsight_token')
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
