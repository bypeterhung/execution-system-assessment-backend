var express = require('express')
var cors = require('cors')
var bodyParser = require('body-parser')
const PORT = process.env.PORT || 3300

// Create a new Express application.
var app = express()
app.use(cors())
app.use(bodyParser.json())

let stocks = null
function getStocks () {
    if (!stocks) { //cache the stocks to avoid repeated sorting
        stocks = [...require('./stocks')]
        stocks = stocks.sort((a, b) => {
            const aNum = parseInt(a.bloombergTicker.split(' ')[0])
            const bNum = parseInt(b.bloombergTicker.split(' ')[0])
            if (aNum && bNum){
                if (aNum > bNum)
                    return 1
                else if (bNum > aNum)
                    return -1
            }
            if (a.bloombergTicker > b.bloombergTicker)
                return 1
            else if (b.bloombergTicker > a.bloombergTicker)
                return -1
            else return 0
        })
    }
    return stocks
}

app.post('/orders', async (req, res) => {
    const order = req.body

    if (order.executionMode === 'Market')
    {
        const stock = getStocks().find(item => item.bloombergTicker === order.stockCode)
        order.orderPrice = stock.price
        order.currency = stock.currency
    }

    if (order.stockCode === '5 HK')
    {
        res.status(500).json({ ...order, error: 'Internal Server Error' })
        return
    }
    else if (order.stockCode === '11 HK')
    {
        res.status(504).json({ ...order, error: 'Gateway Timeout' })
        return
    }
    else if (order.stockCode === '388 HK')
    {
        order.status = 'Rejected'
        res.status(201).json({ ...order })
        return
    }
    order.status = 'Booked'
    await new Promise((resolve) => setInterval(resolve, 5000))  //delay 5 second for demo purpose
    res.status(201).json({ ...order })
})


app.get('/stocks', (req, res) => {
    try {

        const result = {
            data: getStocks(),
            pagination: {}
        }

        result.pagination.recordTotal = result.data.length

        const limit = Number(req.query.limit) || 10
        const offset = Number(req.query.offset) || 0
        result.data = result.data.filter(
            (item, index) => index >= offset && index < offset + limit
        ).map(item => ({ stockCode: item.bloombergTicker, marketPrice: item.price, currency: item.currency }))
        result.pagination.limit = limit
        result.pagination.offset = offset
        res.json(result)
    } catch (ex) {
        res.status(500).json({
            "error": ex.message
        })
        return
    }
})

app.use(function (err, req, res, next) {
    res.status(400).json({ error: err })
})

app.listen(PORT)
console.log('> Ready on http://localhost:' + PORT)
