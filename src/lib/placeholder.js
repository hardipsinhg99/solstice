// The seed data across this project marks anything not yet real with a
// bracketed marker - "[WHATSAPP_NUMBER]", "[PRE_FILLED_MESSAGE]", "[CONFIRM]",
// "[REWRITE]", "[VERIFY]" - rather than leaving the field empty. Empty is easy
// for a consumer to check; a bracketed marker is not, and the WhatsApp FAB
// shipping a link straight to the literal string "[WHATSAPP_NUMBER]" is what
// this predicate exists to make impossible everywhere else the pattern repeats.
//
// This does not replace format validation (isUsableWhatsappNumber, telHref) -
// it answers "has anyone touched this yet", they answer "is what they typed
// usable". A consumer needs both to pass before it renders a live control.
const PLACEHOLDER_PATTERN = /^\[[A-Z_]+\]$/

export function isPlaceholder(value) {
  const s = String(value ?? '').trim()
  return s === '' || PLACEHOLDER_PATTERN.test(s)
}
