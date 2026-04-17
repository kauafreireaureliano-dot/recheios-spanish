const Stripe = require('stripe')

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const stripe = Stripe(process.env.STRIPE_SECRET_KEY)

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body
    const { nome, email } = body || {}

    const intent = await stripe.paymentIntents.create({
      amount: 8800,
      currency: 'mxn',
      receipt_email: email || undefined,
      metadata: { nome: nome || '', produto: 'rellenos-mx' },
      automatic_payment_methods: { enabled: true },
    })

    res.status(200).json({ clientSecret: intent.client_secret })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}
