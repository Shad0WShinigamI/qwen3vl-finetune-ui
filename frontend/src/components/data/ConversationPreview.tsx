import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ChevronLeft, ChevronRight, Image as ImageIcon, User, Bot } from "lucide-react"
import { api } from "@/lib/api"
import { useDatasetStore } from "@/stores/datasetStore"
import type { ConversationPreview as ConvPreview } from "@/lib/types"

export function ConversationPreview() {
  const { mapping } = useDatasetStore()
  const [conversations, setConversations] = useState<ConvPreview[]>([])
  const [start, setStart] = useState(0)

  useEffect(() => {
    if (!mapping) return
    api
      .previewConversations(start, 3)
      .then((res) => setConversations(res.conversations as unknown as ConvPreview[]))
      .catch(() => {})
  }, [mapping, start])

  if (!mapping) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Conversation Preview</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Set column mapping to preview conversations
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">Conversation Preview</CardTitle>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-6 w-6"
              disabled={start === 0}
              onClick={() => setStart(Math.max(0, start - 3))}
            >
              <ChevronLeft className="h-3 w-3" />
            </Button>
            <span className="text-xs text-muted-foreground px-1 tabular-nums">
              {start + 1}–{start + conversations.length}
            </span>
            <Button
              variant="outline"
              size="icon"
              className="h-6 w-6"
              onClick={() => setStart(start + 3)}
            >
              <ChevronRight className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[350px]">
          <div className="space-y-4">
            {conversations.map((conv) => (
              <div key={conv.index} className="border border-border rounded-lg p-3 space-y-2">
                <div className="text-xs text-muted-foreground">
                  Sample #{conv.index + 1}
                </div>
                {conv.messages.map((msg, mi) => (
                  <div key={mi} className="flex gap-2">
                    <div className="shrink-0 mt-0.5">
                      {msg.role === "user" ? (
                        <User className="h-4 w-4 text-blue-400" />
                      ) : (
                        <Bot className="h-4 w-4 text-green-400" />
                      )}
                    </div>
                    <div className="text-sm space-y-1 min-w-0">
                      {msg.content.map((c, ci) =>
                        c.type === "image" ? (
                          <Badge
                            key={ci}
                            variant="secondary"
                            className="gap-1 text-xs"
                          >
                            <ImageIcon className="h-3 w-3" />
                            Image
                          </Badge>
                        ) : (
                          <p key={ci} className="break-words">
                            {c.text}
                          </p>
                        )
                      )}
                    </div>
                  </div>
                ))}
                {conv.image_urls.length > 0 && (
                  <div className="flex gap-2 flex-wrap mt-1">
                    {conv.image_urls.map((url, ui) => (
                      <img
                        key={ui}
                        src={url}
                        alt={`img-${ui}`}
                        className="h-12 w-12 object-cover rounded border border-border"
                        onError={(e) => {
                          ;(e.target as HTMLImageElement).style.display = "none"
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
