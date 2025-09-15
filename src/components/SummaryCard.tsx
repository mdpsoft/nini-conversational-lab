// src/components/SummaryCard.tsx
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Button } from "@/components/ui/button"
import { ChevronDown, ChevronUp } from "lucide-react"
import { useState } from "react"
import ReactMarkdown from "react-markdown"


export function SummaryCard({ title, text }: { title: string; text: string }) {
  const [open, setOpen] = useState(true)

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
          <CardContent className="prose prose-sm max-w-none pt-1">
            <ReactMarkdown 
              components={{
                h2: ({ children }) => <h2 className="text-lg font-semibold text-foreground mt-6 mb-3 first:mt-0">{children}</h2>,
                h3: ({ children }) => <h3 className="text-base font-medium text-foreground mt-4 mb-2">{children}</h3>,
                p: ({ children }) => <p className="text-sm text-muted-foreground leading-6 mb-3">{children}</p>,
                ul: ({ children }) => <ul className="list-disc pl-6 text-sm text-muted-foreground space-y-1 mb-3">{children}</ul>,
                ol: ({ children }) => <ol className="list-decimal pl-6 text-sm text-muted-foreground space-y-1 mb-3">{children}</ol>,
                strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
                code: ({ children }) => <code className="bg-muted px-1 py-0.5 rounded text-xs">{children}</code>
              }}
            >
              {text}
            </ReactMarkdown>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  )
}