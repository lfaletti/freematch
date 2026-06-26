const responses = [
  "Hey! So nice to match with you 😊",
  "Haha, I was just thinking about messaging you first!",
  "This is exciting! Tell me more about yourself.",
  "Hi! Your profile really caught my attention.",
  "Wow, we matched! How's your day going?",
  "Finally! I was hoping you'd swipe right 😄",
  "Hey there! What are you up to this weekend?",
  "Oh hi! Your bio made me smile.",
  "I love your interests, we have so much in common!",
  "Hey! Where do you usually hang out?",
  "This is fun! Have you been on here long?",
  "Hi! What's the best trip you've ever taken?",
  "Hey, what kind of music are you into?",
  "Nice to match! What are you passionate about?",
  "Hi! Are you more of a coffee or tea person?",
  "Hey! What's your idea of a perfect date?",
  "Haha, we matched! That made my day 😊",
  "Hi! What do you do for fun on weekends?",
  "Love your photos! Where was that taken?",
  "Hey, I love hiking too! Any favorite trails?",
  "Oh interesting! Tell me more about that.",
  "Sounds amazing! I would love to hear about it.",
  "Ha, same! Small world.",
  "That is so cool, I have always wanted to try that!",
  "You seem really interesting! What else should I know about you?",
  "Honestly? Same. 😂",
  "OK that is adorable, I need to know more.",
  "Wait, you like that too? No way!",
  "I feel like we would have a lot to talk about.",
  "Okay now I am curious, tell me everything.",
];

const followUpResponses = [
  "That sounds really cool!",
  "Haha, love that!",
  "Wow, I had no idea!",
  "That is genuinely impressive.",
  "You are funny, I like that.",
  "I feel like we would get along really well.",
  "Okay, now I need to know more.",
  "That is such a good answer.",
  "Ha, totally relate to that.",
  "Interesting! What else?",
  "I could talk about this all day.",
  "You just earned major points for that.",
  "Okay seriously though, same.",
  "That made me laugh out loud.",
  "How have we not met before?!",
];

export function getRandomResponse(isFirstMessage: boolean): string {
  const pool = isFirstMessage ? responses : followUpResponses;
  return pool[Math.floor(Math.random() * pool.length)];
}

export function getRandomDelay(): number {
  return Math.floor(Math.random() * 4000) + 1500;
}
