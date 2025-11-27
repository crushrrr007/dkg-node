import { defineDkgPlugin } from "@dkg/plugins";
import { openAPIRoute, z } from "@dkg/plugin-swagger";

export default defineDkgPlugin((ctx, mcp, api) => {
  // ============================================
  // CUSTOM FUNCTIONS - Shared by MCP and API
  // ============================================
  
  function processGreeting(name: string, enthusiastic: boolean = false): string {
    const greeting = `Hello, ${name}! Welcome to the DKG.`;
    return enthusiastic ? greeting.toUpperCase() + " 🎉" : greeting;
  }

  function getNodeStats() {
    return {
      status: "operational",
      timestamp: new Date().toISOString(),
      pluginVersion: "1.0.0",
      uptime: process.uptime(),
      plugin: "example1"
    };
  }

  function echoMessage(message: string) {
    return {
      echo: message,
      length: message.length,
      reversed: message.split('').reverse().join(''),
      uppercase: message.toUpperCase(),
      timestamp: new Date().toISOString()
    };
  }

  // ============================================
  // MCP TOOLS - For AI Agents
  // ============================================

  // MCP Tool #1: Generate Greeting
  mcp.registerTool(
    "generate_greeting",
    {
      title: "Generate Greeting",
      description: "Generates a personalized greeting message for a given name",
      inputSchema: {
        name: z.string().describe("The name of the person to greet"),
        enthusiastic: z.boolean().optional().describe("Whether to make the greeting enthusiastic (all caps with emoji)")
      },
    },
    async ({ name, enthusiastic = false }) => {
      const greeting = processGreeting(name, enthusiastic);
      return {
        content: [{ type: "text", text: greeting }],
      };
    },
  );

  // MCP Tool #2: Get Node Statistics
  mcp.registerTool(
    "get_node_stats",
    {
      title: "Get Node Statistics",
      description: "Retrieves current node statistics and status information",
      inputSchema: {},
    },
    async () => {
      const stats = getNodeStats();
      return {
        content: [{
          type: "text",
          text: `Node Status: ${stats.status}\nUptime: ${Math.floor(stats.uptime)} seconds\nTimestamp: ${stats.timestamp}\nPlugin: ${stats.plugin}`
        }],
      };
    },
  );

  // MCP Tool #3: Echo Message
  mcp.registerTool(
    "echo_message",
    {
      title: "Echo Message",
      description: "Echoes back a message with additional metadata and transformations",
      inputSchema: {
        message: z.string().describe("The message to echo back")
      },
    },
    async ({ message }) => {
      const result = echoMessage(message);
      return {
        content: [{
          type: "text",
          text: `Original: ${result.echo}\nLength: ${result.length}\nReversed: ${result.reversed}\nUppercase: ${result.uppercase}`
        }],
      };
    },
  );

  // ============================================
  // HTTP API ROUTES - REST Endpoints
  // ============================================

  // API Route #1: GET /greeting/:name
  api.get(
    "/greeting/:name",
    openAPIRoute(
      {
        tag: "Greetings",
        summary: "Generate a greeting",
        description: "Generates a personalized greeting for the given name",
        params: z.object({
          name: z.string().openapi({
            description: "Name of the person to greet",
            example: "Himanshu",
          }),
        }),
        query: z.object({
          enthusiastic: z.boolean({ coerce: true }).optional().openapi({
            description: "Make the greeting enthusiastic",
            example: false,
          }),
        }),
        response: {
          description: "Greeting response",
          schema: z.object({
            success: z.boolean(),
            greeting: z.string(),
            timestamp: z.string(),
          }),
        },
      },
      (req, res) => {
        const { name } = req.params;
        const enthusiastic = req.query.enthusiastic || false;
        
        const greeting = processGreeting(name, enthusiastic);
        
        res.json({
          success: true,
          greeting: greeting,
          timestamp: new Date().toISOString(),
        });
      },
    ),
  );

  // API Route #2: GET /stats
  api.get(
    "/stats",
    openAPIRoute(
      {
        tag: "System",
        summary: "Get node statistics",
        description: "Retrieves current node statistics and status",
        response: {
          description: "Node statistics",
          schema: z.object({
            success: z.boolean(),
            data: z.object({
              status: z.string(),
              timestamp: z.string(),
              pluginVersion: z.string(),
              uptime: z.number(),
              plugin: z.string(),
            }),
          }),
        },
      },
      (req, res) => {
        const stats = getNodeStats();
        res.json({
          success: true,
          data: stats,
        });
      },
    ),
  );

  // API Route #3: POST /echo
  api.post(
    "/echo",
    openAPIRoute(
      {
        tag: "Utilities",
        summary: "Echo a message",
        description: "Echoes back a message with transformations and metadata",
        body: z.object({
          message: z.string().openapi({
            description: "The message to echo",
            example: "Hello from plugin-example1!",
          }),
        }),
        response: {
          description: "Echo response with transformations",
          schema: z.object({
            success: z.boolean(),
            data: z.object({
              echo: z.string(),
              length: z.number(),
              reversed: z.string(),
              uppercase: z.string(),
              timestamp: z.string(),
            }),
          }),
        },
      },
      (req, res) => {
        const { message } = req.body;
        
        if (!message) {
          return res.status(400).json({
            success: false,
            error: "Message is required",
          });
        }
        
        const result = echoMessage(message);
        res.json({
          success: true,
          data: result,
        });
      },
    ),
  );

  // API Route #4: GET /health
  api.get(
    "/health",
    openAPIRoute(
      {
        tag: "System",
        summary: "Health check",
        description: "Simple health check endpoint for the plugin",
        response: {
          description: "Health status",
          schema: z.object({
            success: z.boolean(),
            status: z.string(),
            plugin: z.string(),
            timestamp: z.string(),
          }),
        },
      },
      (req, res) => {
        res.json({
          success: true,
          status: "healthy",
          plugin: "example1",
          timestamp: new Date().toISOString(),
        });
      },
    ),
  );
});