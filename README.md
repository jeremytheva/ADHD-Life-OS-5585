# ADHD Life-OS MVP

A comprehensive life management system designed specifically for individuals with ADHD, helping to structure daily life, manage tasks, and maintain routines with intelligent scheduling and adaptive support.

## Features

### 🧠 Core Functionality
- **Smart Scheduling Engine**: Automatically generates daily schedules based on user preferences
- **Task Management**: Create, organize, and track tasks with essential prioritization
- **Routine Builder**: Build and maintain daily/weekly routines with customizable steps
- **Day Skeleton**: Configure your daily structure (wake/sleep times, work hours)
- **Role-Based Profiles**: Switch between different user personas (Adult, Workplace, Parent, Teen)

### 🎯 **NEW: Task Prioritization System**
- **Hybrid Intelligence Engine**: Smart task scoring based on multiple ADHD-optimized factors
- **Manual Priority Fields**: Optional metadata for energy, time, location, interest, and aversiveness
- **Context-Aware Filtering**: "I have 15 min" / "I'm low energy" / "I'm at the café"
- **Dopamine Path Recommendations**:
  - **Quick Wins** ⚡: Fast, easy tasks for instant dopamine
  - **Momentum Builders** 🎯: Medium-effort tasks for productive flow
  - **Brave Frog** 🐸: Aversive but important tasks in microform
- **No-Shame Design**: Tasks decay in rank naturally, no harsh "overdue" labels
- **Offline-First**: Runs completely offline with no network required
- **User-Adjustable Weights**: Customize how the system prioritizes for you

### 🏠 Housework System
- **Pre-built Task Templates**: Comprehensive library of housework tasks organized by room
- **Smart Scheduling**: Automatically balances weekly chore load to prevent overwhelm
- **Interactive Checklists**: Break down tasks into manageable steps with progress tracking
- **Flexible Frequencies**: Daily, weekly, monthly, and seasonal task scheduling
- **Mode-Based Visibility**: Housework tasks only appear in Home mode
- **Celebration Feedback**: Positive reinforcement with animations on task completion
- **No-Shame Design**: Gentle language and supportive UX throughout

### 📅 Timeline System
- **Time Blocking**: Visual timeline with color-coded activity blocks
- **Flexible Scheduling**: Automatically places tasks and routines in available time slots
- **Essential Task Prioritization**: Highlights critical items that must be completed
- **External Event Integration**: Ready for Google Calendar sync

### 🎨 User Experience
- **Low-Stimulus Design**: Clean, focused interface minimizing distractions
- **ADHD-Friendly Interactions**: Simple, clear navigation and feedback
- **Responsive Design**: Works seamlessly on desktop and mobile devices

## Task Prioritization System

### How It Works

The prioritization engine scores tasks (0-100) based on:

1. **Urgency** (30%): Due date proximity and essential flag
2. **Energy Match** (25%): How well task energy matches your current state
3. **Interest** (20%): Your interest level minus aversiveness
4. **Context Match** (15%): Location, time, and available items
5. **Completion Likelihood** (10%): Task characteristics and history

### Using Priority Metadata

When creating or editing tasks, you can optionally add:

- **Energy Required**: Low / Medium / High
- **Time Required**: Minutes needed
- **Interest Level**: 1-5 hearts
- **Aversiveness**: 1-5 scale (how much you dread it)
- **Location**: Where you need to be
- **Required Items**: Tools/items you'll need

### Getting Recommendations

1. Open the **Task Selector** component
2. Set your current state:
   - Energy level
   - Available time
   - Location (optional)
   - Mood
3. Choose a dopamine path or use "Smart Mix"
4. Get 1-3 personalized recommendations

### Dopamine Paths

**Quick Wins** ⚡
- Max 15 minutes
- Low energy required
- High interest
- Perfect for: Starting your day, breaking through resistance

**Momentum Builders** 🎯
- Max 45 minutes
- Medium-high energy
- Good interest match
- Perfect for: Building productive flow, making progress

**Brave Frog** 🐸
- Aversive but essential
- Broken into 10-minute microforms
- Perfect for: Tackling dreaded tasks, clearing mental load

## Architecture

### Frontend (React + Vite)
- **React 18** with modern hooks and patterns
- **TypeScript** for priority system type safety
- **Tailwind CSS** for utility-first styling
- **Framer Motion** for smooth animations
- **React Router** for navigation
- **React Icons** for consistent iconography

### Backend (Supabase)
- **PostgreSQL** database with Row Level Security (RLS)
- **Real-time subscriptions** for live updates
- **Authentication** built-in
- **RESTful API** for data operations

### Priority System Architecture

```
src/
├── types/
│   └── taskPriority.ts          # TypeScript definitions
├── services/
│   ├── taskPriorityModel.ts     # Scoring engine
│   └── taskRecommender.ts       # Recommendation logic
└── components/
    └── tasks/
        ├── TaskSelector.jsx      # Recommendation UI
        ├── TaskMetadataForm.jsx  # Priority metadata input
        └── EnhancedTaskForm.jsx  # Task form with metadata
```

## Getting Started

### Prerequisites
- Node.js 18+ and npm
- A Supabase account and project

### Installation

1. **Clone and install dependencies**
```bash
git clone <repository-url>
cd adhd-life-os-mvp
npm install
```

2. **Set up Supabase**
- Create a new project at [supabase.com](https://supabase.com)
- Run the SQL migration from `src/supabase/migrations/001_adhd_life_os_schema.sql`
- Copy your project URL and anon key

3. **Configure environment variables**
```bash
cp .env.example .env.local
```

Edit `.env.local` and add your Supabase credentials:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### Optional NoCodeBackend auth proxy

This project remains on Vite. Vite does not serve Next.js `app/api` routes, so NoCodeBackend auth requests should go through the same-origin `/api/auth` proxy instead of calling NoCodeBackend directly from browser code.

For local development, `vite.config.js` proxies `/api/auth/*` to `NCB_API_BASE_URL` and injects `NCB_SECRET_KEY` from the server-side Vite runtime environment. For production on Vercel, `api/auth/[...path].js` provides the same `/api/auth/*` endpoint. Keep `NCB_SECRET_KEY` only in server/runtime environment variables; do not create a `VITE_NCB_SECRET_KEY`.

```env
VITE_AUTH_PROVIDER=nocodebackend
VITE_AUTH_PROXY_URL=/api/auth
NCB_API_BASE_URL=https://your-nocodebackend-api.example.com
NCB_SECRET_KEY=your-server-only-secret-key
```

4. **Start development server**
```bash
npm run dev
```

5. **Open your browser**
Navigate to `http://localhost:5173` to view the application.

## Usage Examples

### Creating a Task with Priority Metadata

```javascript
const task = {
  title: "Write blog post",
  description: "Draft article about ADHD productivity",
  due_date: "2024-02-15",
  estimated_duration: 60,
  is_essential: false,
  priority_metadata: {
    energy_required: 'high',
    time_required: 90,
    location: 'home',
    available_items: ['laptop', 'quiet space'],
    interest_level: 4,
    aversiveness: 2
  }
}
```

### Getting Task Recommendations

```javascript
import { taskRecommender } from './services/taskRecommender'

const userState = {
  current_energy: 'medium',
  available_time: 30,
  current_location: 'café',
  mood: 'motivated'
}

const recommendations = taskRecommender.getRecommendations(tasks, userState)
// Returns top 3 recommendations across dopamine paths
```

### Filtering Tasks by Context

```javascript
const filteredTasks = taskRecommender.filterTasks(tasks, {
  max_time: 30,           // I have 30 minutes
  energy_level: 'low',    // I'm low energy
  location: 'home',       // I'm at home
  exclude_aversive: true  // Hide dreaded tasks
})
```

## Development

### Available Scripts
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm run lint:error` - Show only errors

### Code Style
- Uses ESLint with React configuration
- TypeScript for priority system
- 2-space indentation
- Functional components with hooks
- Consistent naming conventions

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For questions or support, please open an issue in the repository.