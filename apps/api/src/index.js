import http from 'node:http'

const PORT = process.env.PORT || 4000

const server = http.createServer((req, res) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  if (req.url === '/health' && req.method === 'GET') {
    res.writeHead(200)
    res.end(JSON.stringify({ data: { status: 'ok' }, error: null }))
    return
  }
  res.writeHead(404)
  res.end(JSON.stringify({ data: null, error: { message: 'Not Found' } }))
})

server.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`)
})
