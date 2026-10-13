YourArogyum: persistent diet plan storage patch

What this patch does:
- Saves the current diet plan, ingredient-based nutrition breakdown, water tracker,
  completed meal tracker, recent-plan context and generation index to the logged-in
  user's MySQL database through the Spring Boot backend.
- Loads that account's saved state on the Diet Plan page.
- Keeps browser session state as a fallback and clears that tab state at logout/account boundaries.
- Uses the existing Spring Security authenticated session and existing MySQL connection.
- Hibernate `ddl-auto=update` should create the new `diet_plan_states` table automatically
  when the backend starts; no manual SQL migration is expected for this project's setup.

Install:
1. Make a backup of your current project first.
2. Extract this ZIP into `E:\Arogyum\YourArogyum-main` and allow files with matching paths
   to be replaced. New backend classes and `src/services/dietPlan.ts` will be added.
3. Start Spring Boot and let it finish starting, so Hibernate can create the table.
4. Run `npm run build` from the project root.
5. Open the app, go to Diet Plan, generate a plan, switch sections, and refresh the browser.
   The plan should reload from the account database. Test by logging out and back into the same account.

Files included:
- Replaced: src/pages/DietPlanPage.tsx, src/App.tsx
- Added: src/services/dietPlan.ts
- Added: backend/.../entity/DietPlanState.java
- Added: backend/.../repository/DietPlanStateRepository.java
- Added: backend/.../service/DietPlanStateService.java
- Added: backend/.../controller/DietPlanStateController.java

Notes:
- The code stores the generated text and structured nutrition result as JSON state. It does not
  make AI nutrition estimates clinically validated.
- If account saving fails, the page displays a warning and keeps the current browser-tab state.
