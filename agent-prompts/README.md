# Agent Prompts - Reference for Code Agents

This folder contains prompts and instructions for AI agents working on FreeMatch.

## Files in This Folder

### 1. `instruction.txt`
**Short instruction to copy/paste when calling an agent**

Use this when you want a quick prompt to give an agent. It points to the next-session.txt file.

```
Lee el archivo next-session.txt en esta carpeta y sigue una de las 
5 opciones que se describen. Asegúrate de que npm run check pase antes de terminar.
```

### 2. `next-session.txt`
**Complete prompt with 5 different paths for the agent to follow**

This is the detailed version with:
- Context about what was done previously
- 5 different task paths (Deploy/Test/JWT/Photos/Continue)
- Critical verifications before finishing
- Expected timelines
- Quick links to documentation

Choose this if you want the agent to have full context and options.

## How to Use

### Quick Call (10 seconds)
Copy the content of `instruction.txt` and paste it when calling an agent.

### Full Context Call
Copy the content of `next-session.txt` when you want the agent to have all details and choices.

### Example Usage

```
# Quick call
"Lee el archivo next-session.txt en la carpeta agent-prompts y sigue una de las 
5 opciones que se describen. Asegúrate de que npm run check pase antes de terminar."

# Or use instruction.txt (it references next-session.txt)
Copy from: agent-prompts/instruction.txt
```

## What the Agent Will Do

The agent will:
1. Read next-session.txt
2. Choose ONE of 5 paths based on project needs
3. Follow that path to completion
4. Verify npm run check passes
5. Update documentation
6. Report back

## Paths Available (Session 4)

1. **Frontend Photo UI** (2-3 hours) - Add photo picker + upload UI
2. **JWT Authentication** (4-6 hours) - Replace x-user-id with JWT tokens (BLOCKS PRODUCTION)
3. **S3 Production Setup** (1-2 hours) - Configure real AWS S3
4. **Deploy to Production** (30-40 min) - Get to production via Railway/Fly.io/Vercel
5. **Continue from Context** (variable) - Follow session notes and priorities

**Note**: Session 1-3 are complete (Scalability, Local Dev, Photo Upload Backend)

Current focus: Frontend integration or JWT auth (JWT is critical for production)

## For Project Managers

Use `instruction.txt` when you just want an agent to pick up work and execute.

## For Developers

Use `next-session.txt` when you want detailed context and multiple options.

## Integration

This folder is meant to be shared with:
- AI code agents (Claude, etc.)
- Team members picking up the project
- Continuous integration/deployment systems
- Anyone needing context on "what to do next"

## Maintaining This Folder (For Agents - IMPORTANT!)

**After each agent session, UPDATE these files for the next session:**

1. **next-session.txt** - Edit section "WHAT WAS DONE IN PREVIOUS SESSION"
   - Add what was accomplished in this session
   - Update the 5 PATH options to reflect current state
   - Remove completed paths, suggest new ones

2. **examples.md** - Add new usage examples
   - Document what paths were used
   - Add new examples based on accomplishments
   - Update expected timelines if needed

3. **instruction.txt** - No changes needed (it references next-session.txt)

**This ensures the next agent has fresh context and doesn't repeat work.**

---

**Created**: June 25, 2026  
**Last Updated**: June 26, 2026  
**Project**: FreeMatch MVP - Photo Upload Complete  
**Status**: Session 3 Complete - Photo Upload Backend Ready
