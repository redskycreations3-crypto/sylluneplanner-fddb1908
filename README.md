# Syllune

Build a modern, mobile-first student study tracking app inspired by the uploaded reference screenshots. Do NOT copy the screenshots exactly; use them as visual and functional inspiration. The app should feel clean, minimal, soft, friendly, and motivating.

APP PURPOSE

Create an all-in-one study companion where students can:

Track their syllabus and chapter completion

Track study time by subject

Use a focus/study timer

Set daily study goals

View study analytics

Create a weekly timetable

Track study streaks

Organize subjects

See overall academic progress

The app should be extremely simple to use and optimized primarily for Android/mobile screens.

1. HOME / DASHBOARD

Create a Home screen similar in structure to the first reference screenshot.

At the top:

Profile/avatar

Current date

Notification icon

Then show attractive summary cards:

Study Days

Display:

Number of days studied

Current study streak

Small fire/streak indicator

Example: "5 DAYS" "🔥 5 day streak"

Today's Study

Display:

Total study time today

Daily target

Progress percentage

Example: "Today's Study" "2h 35m / 4h" "64%"

Syllabus Progress

Create a card showing:

Chapters completed

Total chapters

Percentage completion

Circular or linear progress bar

Example: "24 / 79 Chapters" "30% completed"

Study Buddy / Motivation Card

Create a small friendly mascot/illustration area with customizable text such as:

"Watching you focus..." "Keep going!" "You're doing great!" "One chapter at a time."

Allow the motivational message to change based on progress.

Quick Start

Large button:

"START STUDY"

When tapped, open the focus timer.

Also provide quick subject selection before starting.

2. SUBJECTS

Create a dedicated Subjects page similar to the second reference screenshot.

Display subjects as clean cards/grid.

Each subject card should show:

Subject name

Subject icon

Total study time

Today's study time

Study goal

Progress toward goal

"View Stats"

Edit button

Example subjects:

Physics Chemistry Mathematics Computer Science English Assamese

Allow users to:

Add subject

Rename subject

Delete subject

Choose an icon

Choose an accent color

Set daily study goal

Set weekly study goal

Do not hard-code the subjects. Users must be able to customize them.

3. SYLLABUS TRACKER

This is one of the most important features.

Create a dedicated "Syllabus" section.

Users should be able to create:

Subject → Chapters → Status

Each chapter should have:

Chapter name

Status

Study progress

Revision status

Notes (optional)

Priority

Target date (optional)

Status options:

🔴 Not Started 🟡 Studying 🟢 Completed

Revision options:

Not Revised Revision 1 Revision 2 Revision 3 Mastered

Each subject should show:

"Completed: 6 / 14 chapters"

and:

"43% complete"

Include a progress bar.

Syllabus Dashboard

Show:

Overall: "24 / 79 chapters completed"

Then subject breakdown:

Physics — 6/14 Chemistry — 5/10 Mathematics — 7/13 Computer Science — 3/6 English — 2/10 Assamese — 1/12

The numbers should automatically update whenever a chapter's status changes.

Allow users to:

Add chapter

Edit chapter

Delete chapter

Reorder chapters

Mark chapter completed

Mark chapter as currently studying

Search chapters

Filter by subject

Filter by status

Filter by priority

4. FOCUS / STUDY TIMER

Create a dedicated Focus Session screen inspired by the third reference screenshot.

The timer should be large and minimal.

Example:

00:25:00

Below it show:

"FOCUSING"

and:

Subject: Physics Chapter: Current Electricity

Controls:

Start

Pause

Resume

Stop

Reset

Allow two timer modes:

Stopwatch

Counts upward.

Countdown

User chooses: 15 min 25 min 45 min 60 min 90 min Custom

When the session ends:

Show a completion screen:

"Focus session complete!" "45 minutes studied"

Ask:

Subject? Chapter? What did you study?

Save the session automatically.

5. STUDY SESSION LOG

Every completed study session should be saved.

Each record should contain:

Date

Start time

End time

Duration

Subject

Chapter

Session type

Optional note

Users should be able to edit or delete sessions.

Study time should automatically contribute to:

Daily statistics

Weekly statistics

Monthly statistics

Subject statistics

Chapter statistics

6. ANALYTICS

Create an Analytics page inspired by the fourth reference screenshot.

Tabs:

Today Week Month All Time

Show:

Total Study Time

Example:

Today: 4h 32m This Week: 21h 45m This Month: 82h 10m

Subject Breakdown

Create a beautiful donut/pie chart showing study-time distribution.

Example:

Physics — 35% Chemistry — 25% Mathematics — 30% CS — 10%

Study Activity Calendar

Create a monthly calendar.

Each day should visually indicate how much the user studied.

For example:

No study → empty Low study → light indicator Medium study → medium indicator High study → strong indicator

Time of Day

Show how much the student studies during:

Morning Afternoon Evening Night

Study / Break

If Pomodoro sessions are used, show:

Focus time Break time

Statistics

Display:

Total sessions Longest session Average session Longest streak Current streak Total chapters completed Total study hours

7. TIMETABLE / PLANNER

Create a Timetable page inspired by the fifth reference screenshot.

Allow users to create a weekly timetable.

Days:

Monday Tuesday Wednesday Thursday Friday Saturday Sunday

Each timetable item should contain:

Subject

Chapter/topic

Start time

End time

Optional note

Color/icon

Example:

9:00 AM Physics Current Electricity

10:30 AM Chemistry Solutions

12:00 PM Mathematics Integrals

Users should be able to:

Add schedule

Edit schedule

Delete schedule

Drag and reorder schedule items

Set recurring schedules

Set reminders

Provide both:

Day View

Shows today's schedule.

Week View

Shows the complete weekly timetable.

8. DAILY GOALS

Allow the student to set:

Daily study goal Weekly study goal

Example:

Daily goal: 4 hours

Show progress:

2h 35m / 4h

and percentage:

64%

Allow separate goals for each subject.

Example:

Physics: 1h Chemistry: 1h Maths: 1h CS: 30m

9. STREAK SYSTEM

Track:

Current streak Longest streak Total study days

A study day should count when the student completes at least a configurable minimum amount of study time.

Show a motivational fire/streak indicator.

Do not make the streak system stressful or overly gamified.

10. NOTIFICATIONS / REMINDERS

Allow optional notifications for:

Upcoming timetable sessions

Daily study goal

Revision deadlines

Scheduled study sessions

Streak reminders

Users must be able to disable notifications.

11. NAVIGATION

Use a simple bottom navigation bar with:

🏠 Home 📚 Syllabus ⏱ Focus 📊 Analytics 📅 Planner

Subjects can be accessible from Home/Syllabus rather than requiring another permanent bottom-navigation item.

Keep navigation extremely simple.

12. DESIGN SYSTEM

Use the uploaded screenshots as visual inspiration.

Design characteristics:

Minimal

Soft rounded cards

Lots of whitespace

Subtle shadows

Soft pastel backgrounds

Clean typography

Friendly student-oriented appearance

Smooth animations

Rounded progress indicators

Beautiful but not distracting

Use a soft lavender/purple primary accent, with different subtle colors for subjects.

Do not make the interface overly colorful.

Cards should have large rounded corners.

The app should look polished and premium while remaining simple.

13. RESPONSIVE DESIGN

The primary target is Android mobile.

Make the interface:

Mobile-first

Touch-friendly

Responsive

Easy to use with one hand

Fast

Minimal scrolling where possible

Also make it work reasonably well on tablets and desktop browsers.

14. DATA & STORAGE

All user data must persist.

Store:

Subjects

Chapters

Chapter status

Revision status

Study sessions

Study goals

Timetable

Streaks

Analytics

If authentication/backend is implemented, use a proper database.

If authentication is not needed initially, use local persistence so data survives app/browser restarts.

Structure the database cleanly so authentication and cloud synchronization can be added later.

15. SMART AUTOMATION

Automatically calculate:

Overall syllabus percentage

Subject syllabus percentage

Completed chapters

Remaining chapters

Daily study progress

Weekly study progress

Monthly study progress

Study streak

Subject study-time percentage

Average study session

Longest study session

Everything should update automatically when the user changes data.

16. IMPORTANT USER EXPERIENCE

The app should NOT feel like a complicated productivity tool.

A student should be able to open the app and understand it immediately.

Prioritize:

Start studying

Track syllabus

See today's progress

Follow timetable

Review analytics

Avoid unnecessary features.

Use clear labels instead of complicated terminology.

17. SAMPLE INITIAL DATA

For demonstration purposes, preload these subjects:

Physics Chemistry Mathematics Computer Science English Assamese

Add sample chapters only where necessary to demonstrate the tracker, but make it easy for the user to replace/edit them.

Do not permanently hard-code the syllabus.

18. SETTINGS

Create a Settings page containing:

Profile Subjects Study goals Timer settings Notifications Theme Data management Export data Import data Reset data

Support:

Light mode Dark mode System default

19. FINAL REQUIREMENT

Build the app as a functional product, not just a visual mockup.

All buttons, forms, timers, filters, progress calculations, timetable entries, syllabus updates and analytics should actually work.

The focus timer must continue accurately while the user navigates between screens.

When a study session finishes, it must be saved and reflected throughout the app.

The syllabus tracker and study-time tracker must be connected:

For example, if the student studies "Current Electricity" for 2 hours, that time should be recorded under Physics → Current Electricity.

The overall experience should feel like a combination of:

A simple syllabus tracker

A study timer

A timetable

A study analytics dashboard

but with a single clean and cohesive interface.

Start by building the complete mobile UI and functional core features, then refine the visual design to closely match the clean, soft aesthetic of the uploaded reference screenshots.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://sylluneplanner.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/99bd516b-5bca-47db-8385-dbef5574e804).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
