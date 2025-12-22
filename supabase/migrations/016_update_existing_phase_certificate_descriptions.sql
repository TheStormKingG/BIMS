-- Update existing phase certificates with new 30-word transcript descriptions
-- This migration updates the badge_description field for all existing phase certificates
-- Phase certificates are identified by phase_number IS NOT NULL AND goal_id IS NULL

-- Phase 1: The Quick-Start Sprint
UPDATE badge_credentials
SET badge_description = 'Established confident financial footing by navigating Stashway, setting initial goals, engaging AI guidance, and building core tracking habits that transform awareness into intentional control from day one with clarity momentum.'
WHERE phase_number = 1 
  AND goal_id IS NULL
  AND badge_description != 'Established confident financial footing by navigating Stashway, setting initial goals, engaging AI guidance, and building core tracking habits that transform awareness into intentional control from day one with clarity momentum.';

-- Phase 2: Basic Engagement
UPDATE badge_credentials
SET badge_description = 'Developed disciplined data capture skills through scanning, manual entry, categorisation, reporting, and insight review, converting raw transactions into organised information that supports smarter, calmer, and more confident daily financial decisions.'
WHERE phase_number = 2 
  AND goal_id IS NULL
  AND badge_description != 'Developed disciplined data capture skills through scanning, manual entry, categorisation, reporting, and insight review, converting raw transactions into organised information that supports smarter, calmer, and more confident daily financial decisions.';

-- Phase 3: Intermediate Tracking
UPDATE badge_credentials
SET badge_description = 'Built analytical consistency by sustaining tracking streaks, managing multiple assets, comparing categories, leveraging AI insights, and reviewing trends, strengthening pattern recognition and proactive decision-making across weeks and real-life spending situations.'
WHERE phase_number = 3 
  AND goal_id IS NULL
  AND badge_description != 'Built analytical consistency by sustaining tracking streaks, managing multiple assets, comparing categories, leveraging AI insights, and reviewing trends, strengthening pattern recognition and proactive decision-making across weeks and real-life spending situations.';

-- Phase 4: Advanced Budgeting
UPDATE badge_credentials
SET badge_description = 'Mastered advanced budgeting behaviours by controlling long-term limits, optimising cash transparency, reducing overspend, analysing trends, and reinforcing habits that compound discipline, foresight, and measurable net worth growth over time sustainably.'
WHERE phase_number = 4 
  AND goal_id IS NULL
  AND badge_description != 'Mastered advanced budgeting behaviours by controlling long-term limits, optimising cash transparency, reducing overspend, analysing trends, and reinforcing habits that compound discipline, foresight, and measurable net worth growth over time sustainably.';

-- Phase 5: Financial Mastery
UPDATE badge_credentials
SET badge_description = 'Demonstrated financial mastery through complete visibility, extreme consistency, strategic efficiency, and sustained net worth growth, proving the ability to self-govern money intelligently, calmly, and purposefully across long horizons with confidence.'
WHERE phase_number = 5 
  AND goal_id IS NULL
  AND badge_description != 'Demonstrated financial mastery through complete visibility, extreme consistency, strategic efficiency, and sustained net worth growth, proving the ability to self-govern money intelligently, calmly, and purposefully across long horizons with confidence.';

