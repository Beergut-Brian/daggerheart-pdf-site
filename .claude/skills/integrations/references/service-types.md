# Typical interfaces by service type

Adjust to the brief; these are starting shapes.

**Payments** (Stripe, Square, PayPal): `createPaymentIntent(amount, currency, customer, saveForLater)`, `confirm(intentId)`, `chargeSavedMethod(customer, methodId, amount, idempotencyKey)`, `refund(paymentId, amount)`, `listSavedMethods(customer)`, `parseWebhook(payload, signature)`. Amounts in integer minor units.

**Inventory / POS** (Lightspeed, Square, Shopify POS, Clover): `listItems(cursor)`, `getStockAndPrices(skus)`, `parseStockEvent(payload)`, `recordSale(lines)`. Note: many POS systems lack inventory webhooks; plan polling plus a sales webhook.

**Shipping** (ShipStation, EasyPost, Shippo): `getRates(package, from, to)`, `buyLabel(shipment)`, `voidLabel(labelId)`, `track(trackingNumber)`.

**Tax** (Stripe Tax, Avalara, TaxJar): `calculate(lines, shipTo, shipFrom)`, `commit(transactionId)`, `void(transactionId)`.

**CRM** (HubSpot, GoHighLevel, Salesforce): `upsertContact(contact)`, `createLead(lead, source)`, `addNote(contactId, text)`, `addTag(contactId, tag)`.

**Booking / scheduling** (Calendly, Acuity, Square Appointments): `listAvailability(serviceId, range)`, `book(slot, customer)`, `cancel(bookingId)`, `parseWebhook(payload)`.

**Donations** (Stripe, Givebutter, Donorbox): usually payments plus `createRecurring(plan, customer)`, `cancelRecurring(id)`, `issueReceipt(donationId)`.

**Email** (Resend, Postmark, SendGrid): `send(template, to, data)`, `parseEvent(payload)` for bounces and complaints. Templates by event name, so push or SMS can be added as channels later.

**LLM** (Anthropic, OpenAI, local Ollama): `complete(messages, tools, options)` returning text and tool calls; `countTokens`; cost logging per call. One interface so the model can change in one place.
