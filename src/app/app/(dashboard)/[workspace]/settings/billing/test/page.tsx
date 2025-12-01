"use client"
import { PolarEmbedCheckout } from '@polar-sh/checkout/embed'
import { useEffect } from 'react'

const PurchaseLink = () => {
  useEffect(() => {
    PolarEmbedCheckout.init()
  }, [])

  return (
    <a
      href="__CHECKOUT_LINK__"
      data-polar-checkout
      data-polar-checkout-theme="light"
    >
      Purchase
    </a>
  )
}

export default PurchaseLink