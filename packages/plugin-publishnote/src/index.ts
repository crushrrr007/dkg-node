import { defineDkgPlugin } from "@dkg/plugins";
import { openAPIRoute, z } from "@dkg/plugin-swagger";

export default defineDkgPlugin((ctx, mcp, api) => {
  
  // ============================================
  // API Route #1: POST /publishnote/create
  // Publish JSON-LD as a Knowledge Asset
  // ============================================
  api.post(
    "/publishnote/create",
    openAPIRoute(
      {
        tag: "Publish Note",
        summary: "Create Knowledge Asset",
        description: "Publishes JSON-LD content as a Knowledge Asset to the DKG and returns UAL",
        body: z.object({
          content: z.string().openapi({
            description: "JSON-LD content as a string",
            example: JSON.stringify({
              "@context": "https://schema.org/",
              "@type": "Article",
              "@id": "urn:article:example",
              "name": "Example Article",
              "description": "This is an example article"
            })
          }),
          privacy: z.enum(["public", "private"]).optional().openapi({
            description: "Privacy setting for the Knowledge Asset",
            example: "public"
          })
        }),
        response: {
          description: "Knowledge Asset creation response with UAL",
          schema: z.object({
            success: z.boolean(),
            ual: z.string(),
            explorerLink: z.string(),
            message: z.string()
          })
        }
      },
      async (req, res) => {
        try {
          const { content, privacy = "public" } = req.body;

          // Validate JSON-LD
          let jsonLdContent;
          try {
            jsonLdContent = JSON.parse(content);
          } catch (e) {
            return res.status(400).json({
              success: false,
              error: "Invalid JSON-LD: Content must be valid JSON"
            });
          }

          // Publish to DKG using the dkg client from context
          const result = await ctx.dkg.asset.create(
            {
              public: jsonLdContent
            },
            {
              epochsNum: privacy === "public" ? 2 : 1,
              immutable: false
            }
          );

          const ual = result.UAL;
          const explorerLink = `https://dkg-testnet.origintrail.io/explore?ual=${ual}`;

          return res.json({
            success: true,
            ual: ual,
            explorerLink: explorerLink,
            message: "Knowledge Asset successfully created and published"
          });

        } catch (error: any) {
          console.error("Error creating Knowledge Asset:", error);
          return res.status(500).json({
            success: false,
            error: error?.message || "Failed to create Knowledge Asset"
          });
        }
      }
    )
  );

  // ============================================
  // API Route #2: GET /publishnote/get/:ual
  // Fetch Knowledge Asset by UAL
  // ============================================
  api.get(
    "/publishnote/get/:ual",
    openAPIRoute(
      {
        tag: "Publish Note",
        summary: "Get Knowledge Asset",
        description: "Retrieves a Knowledge Asset from the DKG using its UAL",
        params: z.object({
          ual: z.string().openapi({
            description: "Universal Asset Locator (UAL) of the Knowledge Asset",
            example: "did:dkg:otp:2043/0x1234567890abcdef/123456/789012"
          })
        }),
        response: {
          description: "Knowledge Asset content",
          schema: z.object({
            success: z.boolean(),
            ual: z.string(),
            content: z.any()
          })
        }
      },
      async (req, res) => {
        try {
          const { ual } = req.params;

          // Fetch from DKG
          const result = await ctx.dkg.asset.get(ual);

          return res.json({
            success: true,
            ual: ual,
            content: result.public || result
          });

        } catch (error: any) {
          console.error("Error fetching Knowledge Asset:", error);
          return res.status(500).json({
            success: false,
            error: error?.message || "Failed to fetch Knowledge Asset"
          });
        }
      }
    )
  );

  // ============================================
  // API Route #3: POST /publishnote/query
  // Query Knowledge Assets by SPARQL
  // ============================================
  api.post(
    "/publishnote/query",
    openAPIRoute(
      {
        tag: "Publish Note",
        summary: "Query Knowledge Assets",
        description: "Query Knowledge Assets using SPARQL",
        body: z.object({
          query: z.string().openapi({
            description: "SPARQL query",
            example: "SELECT ?s ?p ?o WHERE { ?s ?p ?o } LIMIT 10"
          })
        }),
        response: {
          description: "Query results",
          schema: z.object({
            success: z.boolean(),
            results: z.any()
          })
        }
      },
      async (req, res) => {
        try {
          const { query } = req.body;

          const results = await ctx.dkg.graph.query(query, "SELECT");

          return res.json({
            success: true,
            results: results
          });

        } catch (error: any) {
          console.error("Error querying Knowledge Assets:", error);
          return res.status(500).json({
            success: false,
            error: error?.message || "Failed to query Knowledge Assets"
          });
        }
      }
    )
  );

  // ============================================
  // MCP Tool: Create Knowledge Asset
  // ============================================
  mcp.registerTool(
    "publish_note",
    {
      title: "Publish Note to DKG",
      description: "Publishes JSON-LD content as a Knowledge Asset to the DKG",
      inputSchema: {
        content: z.string().describe("JSON-LD content as a string"),
        privacy: z.enum(["public", "private"]).optional().describe("Privacy setting")
      }
    },
    async ({ content, privacy = "public" }) => {
      try {
        const jsonLdContent = JSON.parse(content);

        const result = await ctx.dkg.asset.create(
          { public: jsonLdContent },
          { epochsNum: privacy === "public" ? 2 : 1, immutable: false }
        );

        const ual = result.UAL;
        const explorerLink = `https://dkg-testnet.origintrail.io/explore?ual=${ual}`;

        return {
          content: [{
            type: "text",
            text: `Knowledge Asset created successfully!\nUAL: ${ual}\nExplorer: ${explorerLink}`
          }]
        };
      } catch (error: any) {
        return {
          content: [{
            type: "text",
            text: `Error creating Knowledge Asset: ${error?.message || "Unknown error"}`
          }],
          isError: true
        };
      }
    }
  );

  // ============================================
  // MCP Tool: Get Knowledge Asset
  // ============================================
  mcp.registerTool(
    "get_published_note",
    {
      title: "Get Published Note",
      description: "Retrieves a Knowledge Asset from the DKG using its UAL",
      inputSchema: {
        ual: z.string().describe("Universal Asset Locator (UAL)")
      }
    },
    async ({ ual }) => {
      try {
        const result = await ctx.dkg.asset.get(ual);

        return {
          content: [{
            type: "text",
            text: `Knowledge Asset retrieved:\n${JSON.stringify(result.public || result, null, 2)}`
          }]
        };
      } catch (error: any) {
        return {
          content: [{
            type: "text",
            text: `Error fetching Knowledge Asset: ${error?.message || "Unknown error"}`
          }],
          isError: true
        };
      }
    }
  );
});
