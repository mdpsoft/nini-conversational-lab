// src/components/SummaryCard.tsx
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Button } from "@/components/ui/button"
import { ChevronDown, ChevronUp } from "lucide-react"
import { useMemo, useState } from "react"

// Renderizador simple de "pseudo-markdown":
// - Párrafos separados por \n
// - Viñetas si la línea empieza con "- "
function renderRich(text: string) {
  const lines = text.split("\n").map(l => l.trim())
  const blocks: Array<JSX.Element> = []
  let buffer: string[] = []
  let list: string[] = []

  const flushP = () => {
    if (buffer.length) {
      blocks.push(
        <p key={`p-${blocks.length}`} className="text-sm text-muted-foreground leading-6">
          {buffer.join(" ")}
        </p>
      )
      buffer = []
    }
  }
  const flushList = () => {
    if (list.length) {
      blocks.push(
        <ul key={`ul-${blocks.length}`} className="list-disc pl-6 text-sm text-muted-foreground space-y-1">
          {list.map((item, i) => <li key={i}>{item}</li>)}
        </ul>
      )
      list = []
    }
  }

  lines.forEach((l) => {
    if (l.startsWith("- ")) {
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