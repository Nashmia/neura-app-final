/**
 * Curated dementia-caregiving knowledge base for the RAG assistant.
 * Written from general public guidance patterns (Alzheimer's Association,
 * NIA, NHS style caregiving advice) — general supportive guidance only,
 * not medical advice specific to any individual.
 */
export type KnowledgeArticle = { source: string; title: string; text: string };

export const knowledgeBase: KnowledgeArticle[] = [
  {
    source: "stages-overview",
    title: "Understanding the stages of dementia",
    text: "Dementia typically progresses through mild, moderate, and severe stages, though the pace and symptoms vary widely by person. In the mild stage, people can often still live fairly independently but may struggle with word-finding, planning, or recent memory. In the moderate stage, more support is needed with daily tasks like dressing and meals, and confusion, repetition, and mood changes become more common. In the severe stage, people usually need full-time care, including help with eating, walking, and personal hygiene, and communication becomes mostly nonverbal. Understanding roughly where a patient is in this progression helps caregivers set realistic expectations, choose appropriate activities, and plan ahead for the level of support that will be needed next, rather than being caught off guard by new symptoms.",
  },
  {
    source: "repeated-questions",
    title: "Responding to repeated questions",
    text: "It's very common for a person with dementia to ask the same question many times in a short period, because they genuinely don't remember having asked or been answered before. Getting frustrated or pointing out that they already asked usually causes distress without helping. Instead, answer calmly and briefly each time, as if it were the first time. If a question reflects anxiety (like repeatedly asking when a family member is arriving), try addressing the underlying feeling — reassurance, a clock or written note they can refer to, or a distracting activity can help more than a factual answer alone. Writing key information on a whiteboard in a shared space can also reduce how often the same question needs to be asked.",
  },
  {
    source: "sundowning",
    title: "Sundowning: managing evening confusion and agitation",
    text: "Sundowning refers to increased confusion, restlessness, or agitation that tends to appear in the late afternoon and evening. It's thought to relate to fatigue, disrupted internal clocks, and lower light levels. To reduce it, try keeping a consistent daily routine, ensuring good light exposure earlier in the day, limiting caffeine and long naps late in the day, and creating a calm, well-lit environment in the evening as it gets dark. Reduce evening noise and stimulation, and consider a simple, calming pre-bedtime routine. If sundowning episodes involve agitation, stay calm, avoid arguing, and try gentle redirection to a soothing activity like listening to familiar music rather than confrontation.",
  },
  {
    source: "wandering",
    title: "Wandering: prevention and safety",
    text: "Wandering is common and can be dangerous, especially if a person leaves home unnoticed. Reduce risk by securing doors with alarms or high placed locks, using door sensors, and identifying triggers such as boredom, a need to use the bathroom, or a desire to 'go home' or 'go to work' from an earlier chapter of life. Keep a recent photo and updated description on hand, and consider a GPS tracking device or medical ID bracelet. Structured daily activity and exercise can reduce the restlessness that sometimes leads to wandering. If someone does go missing, search the immediate area first, then contact local authorities quickly — do not wait, as time matters.",
  },
  {
    source: "communication-techniques",
    title: "Communication techniques for dementia care",
    text: "Simple, clear, and calm communication makes daily interactions much easier. Use short sentences, ask one question at a time, and give the person extra time to respond. Avoid open-ended questions like 'what do you want for lunch?' and instead offer two simple choices. Maintain eye contact, speak at a normal volume and pace (avoid talking down to them), and use gentle touch and a warm tone to convey reassurance even when words are hard to follow. If they don't understand, rephrase rather than repeating the exact same words louder. Nonverbal cues — facial expression, posture, tone — often communicate more than the words themselves, so staying calm and patient matters even when the conversation is difficult.",
  },
  {
    source: "validation-therapy",
    title: "Validation therapy: entering their reality",
    text: "Validation therapy is an approach where, instead of correcting or arguing with a person's confused beliefs (for example, believing a deceased parent is still alive), the caregiver acknowledges the emotion behind the statement rather than the factual accuracy. Correcting someone repeatedly can cause distress and damage trust, since they may not be able to retain the correction anyway. Instead, respond to the feeling: if they seem to be looking for comfort, offer comfort; if they seem anxious, help them feel safe. This doesn't mean lying elaborately, but it does mean prioritizing emotional wellbeing over factual correction in moments of confusion, which tends to reduce agitation and preserve dignity.",
  },
  {
    source: "reminiscence-therapy",
    title: "Reminiscence therapy: using memories to connect",
    text: "Long-term memories are often preserved much longer than short-term memories in dementia, which makes reminiscing a powerful way to connect. Looking through old photo albums, playing music from their young adulthood, discussing familiar past jobs or hobbies, or handling meaningful objects can spark engagement, conversation, and positive emotion even in moderate to advanced stages. Ask open, gentle prompts about the past rather than quizzing them on specific facts or dates, which can cause frustration. Regular reminiscence sessions can also reduce agitation and improve mood, and they give family members, including grandchildren, a comfortable way to connect meaningfully.",
  },
  {
    source: "mealtime-challenges",
    title: "Managing mealtime challenges and appetite changes",
    text: "Appetite and eating behavior often change with dementia — some people forget they've eaten and ask for food repeatedly, others lose interest in eating, and some struggle with using utensils. Keep mealtimes calm, consistent, and free of distractions like a loud TV. Offer finger foods if utensils become difficult, and serve smaller, more frequent meals if a full plate feels overwhelming. Bright, contrasting plate colors can help some people see their food better. If weight loss becomes a concern, consult a doctor rather than assuming it's just part of the disease, since untreated dental pain, depression, or swallowing difficulty can also be the cause.",
  },
  {
    source: "bathing-hygiene",
    title: "Bathing and hygiene resistance",
    text: "Resistance to bathing is one of the most common and stressful caregiving challenges, often driven by fear, cold, loss of privacy, or simply not understanding why it's necessary. Keep the bathroom warm, explain each step calmly right before you do it ('I'm going to wash your arm now'), and maintain as much privacy and dignity as possible with towels. Stick to a consistent time of day that matches their past habits. If a full shower causes distress, a sponge bath or washing in stages across the day can be a reasonable compromise. Avoid rushing or arguing — if resistance is strong, stepping away and trying again in fifteen minutes often works better than pushing through.",
  },
  {
    source: "medication-management",
    title: "Medication management tips for caregivers",
    text: "As dementia progresses, most people can no longer manage their own medications safely and need a caregiver to take over. Use a pill organizer sorted by day and time, keep an up-to-date written list of all medications and dosages for appointments and emergencies, and store medication securely out of reach if the patient might take extra doses by mistake. Track doses taken versus missed so patterns are easy to spot. Never adjust a dosage or stop a medication without consulting the prescribing doctor, even if a dose seems to be causing side effects — call the doctor's office instead. Bring the full medication list to every medical appointment.",
  },
  {
    source: "agitation-aggression",
    title: "Recognizing and responding to agitation or aggression",
    text: "Agitation and occasional aggression can occur as dementia progresses, often triggered by pain, fear, overstimulation, frustration at not being understood, or a change in routine or environment. Rather than reacting to the behavior itself, look for the underlying trigger — Are they in pain? Overtired? Overwhelmed by noise or too many people? Stay calm, lower your voice, give them space, and remove or reduce the trigger if possible. Avoid arguing or trying to reason through the behavior in the moment. Once the person is calm, note what happened and what preceded it, so patterns can be identified and discussed with their doctor if episodes are frequent or intense.",
  },
  {
    source: "hallucinations-delusions",
    title: "Understanding hallucinations and delusions",
    text: "Some people with dementia experience hallucinations (seeing or hearing things that aren't there) or delusions (strongly held false beliefs, such as thinking someone is stealing from them). These are symptoms of the disease, not something the person can control or reason their way out of. Avoid arguing about whether it's 'real' — instead, respond to their emotional state and gently redirect attention. Make sure the environment isn't contributing (poor lighting, reflective surfaces, or patterned rugs can sometimes trigger misperceptions). If hallucinations or delusions are frequent, distressing, or involve accusations against caregivers, it's worth discussing with a doctor, since some causes are treatable.",
  },
  {
    source: "sleep-problems",
    title: "Sleep problems and nighttime routines",
    text: "Disrupted sleep is common in dementia and can be exhausting for both the patient and caregiver. Keep a consistent wake and sleep schedule, encourage daytime light exposure and physical activity, and limit long naps late in the day. Build a calming pre-bed routine — dim lighting, quiet activity, perhaps familiar music — to signal that it's time to wind down. Reduce caffeine in the afternoon and evening. If nighttime waking involves confusion about where they are, a small night light and clearly visible path to the bathroom can help prevent falls and reduce disorientation. Persistent severe sleep disruption is worth raising with a doctor.",
  },
  {
    source: "home-safety",
    title: "Home safety modifications",
    text: "Making the home safer reduces fall and injury risk as dementia progresses. Remove trip hazards like loose rugs and clutter, add grab bars in the bathroom, and improve lighting throughout, especially on stairs and hallways. Lock away or remove access to hazardous items like cleaning chemicals, sharp knives when unsupervised, and car keys if driving is no longer safe. Label doors and cabinets with pictures or words if that helps with orientation. Consider stove safety devices if cooking unsupervised has become risky. Reassess the home periodically, since safety needs change as the disease progresses — what was safe a year ago may not be safe now.",
  },
  {
    source: "driving-safety",
    title: "Driving safety and when to stop",
    text: "Deciding when someone with dementia should stop driving is one of the hardest conversations caregivers face, but unsafe driving puts both the patient and others at real risk. Warning signs include getting lost on familiar routes, slow reaction times, difficulty with signs or signals, and new dents or scrapes on the car. Have the conversation early and involve their doctor, who can sometimes deliver the message as a medical recommendation, which is often easier to accept than family pressure alone. If they resist, practical steps like relocating the car, disabling it, or discreetly limiting access to keys may be necessary for safety, alongside arranging reliable alternative transportation.",
  },
  {
    source: "legal-financial-planning",
    title: "Legal and financial planning early on",
    text: "It's important to handle legal and financial planning as early as possible after a diagnosis, while the person can still meaningfully participate in decisions. Key documents include a durable power of attorney for finances, a healthcare power of attorney or advance directive outlining medical wishes, and an updated will. Consolidate financial accounts and set up a system for bill payment and monitoring, since managing money is often one of the earliest skills affected. Speaking with an elder law attorney can help navigate these documents correctly for your region. Waiting too long can mean the person loses the legal capacity to sign these documents themselves.",
  },
  {
    source: "respite-care",
    title: "Respite care: giving yourself a break",
    text: "Respite care means arranging temporary care — a few hours, a day, or longer — so the primary caregiver can rest, run errands, or simply recharge. Options include in-home respite aides, adult day programs, or short residential stays at a care facility. Many caregivers feel guilty taking a break, but consistent respite actually improves the quality of care they can provide and reduces burnout and health problems over time. Start using respite care before you're at a breaking point, not after — even a regular few hours a week can make a meaningful difference to a caregiver's wellbeing and patience.",
  },
  {
    source: "caregiver-burnout",
    title: "Caregiver burnout: warning signs and self-care",
    text: "Caregiver burnout is extremely common and can show up as chronic exhaustion, irritability, withdrawing from friends, trouble sleeping, getting sick more often, or feeling hopeless. Left unaddressed, it can seriously harm both the caregiver's health and their ability to provide good care. Warning signs to watch for in yourself include dreading caregiving tasks, feeling resentful, or having little patience left for small things. Protective steps include accepting help when offered, using respite care, maintaining your own medical appointments and sleep, staying connected to friends, and joining a caregiver support group. Taking care of yourself isn't selfish — it's what makes sustained caregiving possible.",
  },
  {
    source: "denial",
    title: "Dealing with denial — the patient's or the family's",
    text: "Denial can come from the patient (insisting nothing is wrong, refusing evaluation or help) or from family members struggling to accept the diagnosis and its implications. Patient denial is sometimes a symptom of the disease itself (anosognosia — reduced awareness of one's own condition), not simple stubbornness, so confrontation rarely helps. Focus on safety and gentle involvement rather than winning an argument about the diagnosis. Family denial can delay planning and safety measures — sharing specific observed incidents, involving a doctor, or connecting with a support group can help other family members recognize the reality of the situation without feeling attacked or blamed.",
  },
  {
    source: "holidays-visitors",
    title: "Managing holidays and visitors",
    text: "Holidays and visitors can be wonderful for connection but also overwhelming for someone with dementia, since large groups, noise, and disrupted routine can trigger agitation or confusion. Prepare visitors in advance with a few simple tips: speak calmly, don't quiz the person on names or memories, and be patient with repetition. Keep gatherings shorter and quieter than in the past if needed, with a calm space the person can retreat to if overwhelmed. Try to preserve some familiar routine elements even during holidays — familiar mealtimes, favorite music — to provide a sense of stability amid the change in schedule.",
  },
  {
    source: "assistive-technology",
    title: "Helpful technology and assistive devices",
    text: "A range of low-cost technology can support both safety and independence. Automatic pill dispensers and medication reminder apps help with adherence. GPS trackers or wearable devices help locate someone who wanders. Video doorbells and motion-sensor lights add a layer of home safety. Digital picture frames that cycle through family photos, or simple voice assistants set up with helpful reminders, can provide comfort and orientation. Simplified phones with large buttons and pre-programmed contacts help maintain connection to family without the confusion of a complex smartphone. Choose tools that match the person's current abilities rather than assuming more technology is always better.",
  },
  {
    source: "exercise-benefits",
    title: "The importance of physical exercise",
    text: "Regular, gentle physical activity has real benefits for people with dementia — it can improve mood, sleep quality, and mobility, and may help slow functional decline. Walking, chair exercises, stretching, and dancing to familiar music are all good low-risk options. Activity doesn't need to be intense to help; even 20-30 minutes a day, broken into shorter sessions if needed, is valuable. Exercise together when possible, both for safety supervision and because shared activity can be an enjoyable connection point. Always consider mobility limitations and fall risk, and check with a doctor before starting a new activity if there are other health conditions involved.",
  },
  {
    source: "nutrition-hydration",
    title: "Nutrition and hydration tips",
    text: "Good nutrition and adequate hydration support overall health and can affect mood, energy, and cognitive function. People with dementia may forget to drink water, so offering fluids regularly throughout the day — not just at meals — helps prevent dehydration, which can worsen confusion. Favor nutrient-dense, familiar foods, and don't be afraid to serve the same well-liked meals repeatedly if that increases how much they eat. Finger foods and smaller, more frequent meals can help if sitting through a full meal is difficult. Watch for sudden appetite or weight changes and mention them to a doctor, since they can signal other underlying issues.",
  },
  {
    source: "warning-signs-doctor",
    title: "When to see a doctor: warning signs",
    text: "While dementia symptoms generally progress gradually, some changes warrant a prompt call to the doctor rather than waiting for the next scheduled visit. These include a sudden, sharp increase in confusion (which can indicate a urinary tract infection or other acute illness, not just disease progression), new or worsening hallucinations, a fall or head injury, signs of pain that can't be verbally described, sudden changes in mobility or swallowing, or a significant, unexplained mood or behavior shift. Sudden changes are especially important to flag quickly, since they're more often caused by a treatable medical issue than by the dementia itself.",
  },
  {
    source: "emergencies",
    title: "Handling emergencies",
    text: "Prepare for emergencies before they happen. Keep an updated list of medications, allergies, doctors, and emergency contacts somewhere easy to grab, and consider a duplicate copy in the car or with a nearby family member. If the person wanders and cannot be found within a few minutes of searching nearby, call local emergency services immediately rather than waiting — time is critical. For sudden severe confusion, a fall, chest pain, difficulty breathing, or a head injury, seek emergency medical care right away. Wearing a medical ID bracelet with key information and an emergency contact number can be invaluable if the person becomes separated from caregivers.",
  },
  {
    source: "end-of-life-planning",
    title: "End-of-life conversations and planning",
    text: "Advanced dementia is a life-limiting condition, and having end-of-life conversations earlier — while the person can still express preferences — leads to care that better reflects their wishes. Topics include preferences around hospitalization, resuscitation, feeding tubes, and where they'd want to be cared for in their final stage. A palliative or hospice care team can support comfort-focused care and family support once curative treatment is no longer the goal. These conversations are difficult but tend to reduce family conflict and guilt later, because decisions are grounded in the person's own previously stated wishes rather than guesswork made under stress.",
  },
  {
    source: "support-groups",
    title: "Finding and joining a support group",
    text: "Caregiver support groups — in person or online — connect you with people who understand the specific challenges of dementia caregiving in a way friends and family often can't. They're a source of practical tips, emotional support, and validation that your frustration, grief, and exhaustion are normal reactions to a genuinely hard role, not personal failures. Many hospitals, community centers, and national dementia organizations run free groups, and there are active online communities as well for caregivers who can't easily leave home. Trying more than one group can help you find the right fit, since group dynamics and focus vary.",
  },
  {
    source: "talking-to-children",
    title: "Talking to children about a family member's dementia",
    text: "Children often notice something is different about a grandparent or family member and benefit from simple, honest, age-appropriate explanations rather than being kept in the dark, which can lead to confusion or fear. Explain that the person's brain is sick in a way that affects memory and behavior, that it isn't contagious, and that it isn't the child's fault if the person doesn't recognize them or reacts unusually. Reassure them it's okay to feel sad, confused, or even embarrassed sometimes. Involve children in simple, positive shared activities — looking at photos together, music, or a short visit — so the relationship isn't defined only by loss.",
  },
  {
    source: "incontinence",
    title: "Managing incontinence with dignity",
    text: "Incontinence often develops in moderate to advanced dementia and can be distressing for both the patient and caregiver. Establish a regular bathroom schedule (for example, every two to three hours) rather than waiting for the person to ask, since they may not recognize or communicate the need in time. Use easy-to-remove clothing and appropriate protective products, and keep the bathroom clearly signed or visible. Handle accidents calmly and without visible frustration or embarrassment, since shame can worsen anxiety and withdrawal. If incontinence appears suddenly rather than gradually, mention it to a doctor, as it can sometimes indicate an infection or other treatable cause.",
  },
  {
    source: "paranoia-accusations",
    title: "Responding to paranoia and false accusations",
    text: "It's common for someone with dementia to become suspicious or accuse caregivers or family members of stealing, lying, or plotting against them, often because they've misplaced an item and can't recall doing so. This isn't a reflection of how they truly feel about you — it's a symptom of the disease. Avoid taking it personally or arguing to prove your innocence, which rarely helps and can escalate distress. Instead, stay calm, gently help 'find' the item together, and redirect to another activity. Keeping duplicate sets of commonly misplaced items (like glasses or a wallet) can reduce how often this situation comes up.",
  },
  {
    source: "doctor-appointment-prep",
    title: "Preparing for a doctor's appointment",
    text: "Getting the most out of a medical appointment takes some preparation. Bring an updated medication list, a short written summary of any new symptoms, behavior changes, falls, or concerns since the last visit, and specific questions you want answered, since it's easy to forget them in the moment. If possible, request extra time or a caregiver-focused portion of the visit, since some things are easier to discuss without the patient present, and some may be worth discussing with the patient in the room to keep them included. Bring someone else along if you can, both for support and as a second set of ears.",
  },
  {
    source: "routines",
    title: "Understanding why routines matter",
    text: "Consistent daily routines provide a sense of safety and predictability that can significantly reduce confusion, anxiety, and agitation in dementia. When a person can no longer reliably form new memories, a familiar rhythm to the day — consistent wake time, meals, activities, and bedtime — becomes an external anchor they can rely on even when their internal sense of time and sequence is unreliable. Sudden changes to routine, environment, or caregivers are common triggers for distress or behavioral changes. Where change is unavoidable (a move, a new caregiver, travel), introducing it gradually and keeping other familiar elements steady can help ease the transition.",
  },
];
