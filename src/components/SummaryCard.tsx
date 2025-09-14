// src/components/SummaryCard.tsx
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Button } from "@/components/ui/button"
import { ChevronDown, ChevronUp } from "lucide-react"
import { useMemo, useState } from "react"

// Renderizador simple de "pseudo-markdown":
// - Párrafos separados por \n
// - Viñetas si la línea empieza con "- "
// - Headers si empieza con "## " o "### "
// - Bold si está entre **texto**
function renderRich(text: string) {
  const lines = text.split("\n").map(l => l.trim()).filter(l => l)
  const blocks: Array<JSX.Element> = []
  let buffer: string[] = []
  let list: string[] = []

  const flushP = () => {
    if (buffer.length) {
      const content = buffer.join(" ")
      const rendered = renderInlineMarkdown(content)
      blocks.push(
        <p key={`p-${blocks.length}`} className="text-sm text-muted-foreground leading-6">
          {rendered}
        </p>
      )
      buffer = []
    }
  }
  
  const flushList = () => {
    if (list.length) {
      blocks.push(
        <ul key={`ul-${blocks.length}`} className="list-disc pl-6 text-sm text-muted-foreground space-y-1">
          {list.map((item, i) => (
            <li key={i}>{renderInlineMarkdown(item)}</li>
          ))}
        </ul>
      )
      list = []
    }
  }

  const renderInlineMarkdown = (text: string) => {
    // Simple bold rendering **text** -> <strong>text</strong>
    const parts = text.split(/(\*\*[^*]+\*\*)/g)
    return parts.map((part, i) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return <strong key={i} className="font-semibold text-foreground">{part.slice(2, -2)}</strong>
      }
      return part
    })
  }

  lines.forEach((l) => {
    if (l.startsWith("## ")) {
      flushP(); flushList()
      blocks.push(
        <h2 key={`h2-${blocks.length}`} className="text-lg font-semibold text-foreground mt-6 mb-3 first:mt-0">
          {l.slice(3)}
        </h2>
      )
    } else if (l.startsWith("### ")) {
      flushP(); flushList()
      blocks.push(
        <h3 key={`h3-${blocks.length}`} className="text-base font-medium text-foreground mt-4 mb-2">
          {l.slice(4)}
        </h3>
      )
    } else if (l.startsWith("- ")) {
      flushP()
      list.push(l.slice(2))
    } else if (l === "") {
      flushP(); flushList()
    } else {
      flushList()
      buffer.push(l)
    }
  })
  flushP(); flushList()
  return blocks
}

export function SummaryCard({ title, text }: { title: string; text: string }) {
  const [open, setOpen] = useState(true)
  const rich = useMemo(() => renderRich(text), [text])

  return (
    <Card className="mt-4">
      <Collapsible open={open} onOpenChange={setOpen}>
        <CardHeader className="py-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">{title}</CardTitle>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-1">
                {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                {open ? "Ocultar" : "Mostrar"}
              </Button>
            </CollapsibleTrigger>
          </div>
        </CardHeader>
        <CollapsibleContent asChild>
          <CardContent className="prose prose-sm max-w-none pt-1 space-y-3">
            {rich}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  )
}