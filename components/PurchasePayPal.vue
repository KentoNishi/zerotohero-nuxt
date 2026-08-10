<template>
  <div class="purchase-paypal">
    <div class="purchase-paypal-alerts">
      <div
        class="alert alert-success p-3 text-center"
        v-if="paypalPaymentStatus === 'success'"
      >
        <Loader
          :sticky="true"
          message="Payment successful, activating your Pro account..."
        />
      </div>
      <div
        class="alert alert-warning p-3 text-center"
        v-if="paypalPaymentStatus === 'cancelled'"
      >
        {{ $tb("It seems like you've cancelled the checkout, please try again.") }}
      </div>
      <div
        class="alert alert-warning p-3 text-center"
        v-if="paypalPaymentStatus === 'error'"
      >
        <p>
          {{ $tb("We're sorry, your payment didn't work this time, please try again.") }}
        </p>
        <p>
          {{ $tb('If you need further assistance, please contact support') }}: <a href="mailto:jon.long@zerotohero.ca">{{ $tb('Send us an email') }}</a>
        </p>
      </div>
    </div>
    <div v-if="price" ref="paypalButton" class="paypal-button-container"></div>
  </div>
</template>

<script>
import { PYTHON_SERVER, SALE } from "../lib/utils";
import { HOST } from "../lib/utils/url";
import { getPrices } from "../lib/prices";

export default {
  data() {
    return {
      price: undefined, // Updated in created()
      paypalPaymentStatus: undefined,
      paypalEnv: process.env.PAYPAL_ENV || 'production',
      paypalCredentials: {
        sandbox: process.env.PAYPAL_SANDBOX_CLIENT_ID || '',
        production: process.env.PAYPAL_CLIENT_ID || '',
      },
    }
  },
  async created() {
    try {
      const allPlans = await getPrices()
      const lifetimeUSDPlan = allPlans.find(price => price.status === 'current' && price.type === (SALE ? 'sale' : 'regular') && price.plan === 'lifetime' && price.currency === 'usd')
      this.price = lifetimeUSDPlan.amount.toFixed(2)
    } catch (error) {
      console.error('Failed to fetch prices:', error)
    }
  },
  mounted() {
    this.renderPayPalButton()
  },
  methods: {
    renderPayPalButton() {
      if (!this.price) return
      const clientId = this.paypalEnv === 'sandbox'
        ? this.paypalCredentials.sandbox
        : this.paypalCredentials.production
      if (!clientId) {
        console.error(`[PayPal] client id missing for env ${this.paypalEnv}`)
        this.paypalPaymentStatus = 'error'
        return
      }

      const sdkBase = this.paypalEnv === 'sandbox'
        ? 'https://www.sandbox.paypal.com/sdk/js'
        : 'https://www.paypal.com/sdk/js'
      const sdkUrl = `${sdkBase}?client-id=${clientId}&intent=capture&currency=USD&components=buttons`

      const script = document.createElement('script')
      script.src = sdkUrl
      script.onload = () => {
        try {
          window.paypal.Buttons({
            createOrder: async () => {
              const res = await fetch(`${PYTHON_SERVER}create-paypal-order`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  user_id: this.$auth.user && this.$auth.user.id,
                  host: HOST,
                  amount: this.price,
                }),
              })
              if (!res.ok) {
                throw new Error(`Failed to create PayPal order: ${res.status}`)
              }
              const data = await res.json()
              return data.id
            },
            onApprove: (data) => {
              this.paypalPaymentStatus = 'success'
              window.location = `${PYTHON_SERVER}paypal_checkout_success?order_id=${data.orderID}&user_id=${this.$auth.user.id}&host=${HOST}`
            },
            onCancel: () => {
              this.paypalPaymentStatus = 'cancelled'
            },
            onError: (err) => {
              console.error('[PayPal] error:', err)
              this.paypalPaymentStatus = 'error'
            },
          }).render(this.$refs.paypalButton)
        } catch (err) {
          console.error('[PayPal] render failed:', err)
          this.paypalPaymentStatus = 'error'
        }
      }
      script.onerror = () => {
        console.error('[PayPal] SDK script failed to load')
        this.paypalPaymentStatus = 'error'
      }
      document.head.appendChild(script)
    },
  },
}
</script>

<style lang="scss" scoped>
.purchase-paypal {
  .paypal-button-container {
    max-width: 15rem;
    margin: 0 auto;
  }
}
</style>
