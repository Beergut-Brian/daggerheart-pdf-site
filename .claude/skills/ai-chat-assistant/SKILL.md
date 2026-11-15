---
name: ai-chat-assistant
description: Build a site chat or recommendation assistant that lives in the backend, uses a small set of tools over the site's data, and is safe to put in front of customers. Use when a brief asks for chat, a shopping assistant, product recommendations, an FAQ bot, or a donor or volunteer helper.
---

# ai-chat-assistant

The chat is a backend route that gives an LLM tools over the site's data. It answers only from tool results. It lives in the backend so the website and any app share one chat.

## Build

1. **Provider interface**: `complete(messages, tools, options)` behind the `integrations` pattern. Model and provider are config. Log tokens and cost per conversation from day one.
2. **Tools** (name them for the domain): search items with filters, get one item (details, price, availability), read and save the visitor's profile (only what they state), propose a draft (bundle, quote, donation plan), apply a change after confirmation (cart, bundle, form prefill), read current status (order, subscription, booking).
3. **Data first**: recommendations need structured attributes on items (for a pet store: species, life stage, size, main protein, category; for services: service type, area, duration). The agent can draft attributes from descriptions; a person approves them before use. Add this as a data-entry phase.
4. **Route**: streams responses; versioned; rate-limited per visitor; conversation length capped.
5. **UI**: a panel component available on every page plus a full-page view, built from the design system.

## Guardrails (in the system prompt and enforced in code)

- Recommend only items a tool returned in this conversation. Names, prices, and availability come from tool results, never from the model's memory.
- No medical, veterinary, legal, or financial advice. Short reply pointing to a professional.
- Ask before changing a cart, bundle, booking, or form.
- Never discuss discounts, prices, or policies beyond what a tool returns. Attempts to negotiate get a polite no.
- Message and length limits per visitor to control cost.
- Conversations logged for review; deleted on request; personal data minimized.

## Scripted tests (run on every prompt or tool change)

Keep `chat/tests/*.md`, each a conversation with expected behavior. Minimum set: a new customer with a stated need; a returning customer; a stated allergy or constraint; an out-of-stock item; a request for professional advice; an attempt to get a discount; an attempt to make the bot ignore its rules; a handoff to checkout or a form. Pass criteria are specific (tool called, item from results only, confirmation asked).

## Done when

Scripted tests pass; cost per conversation is logged; the assistant can complete the brief's primary action end to end in test mode.
