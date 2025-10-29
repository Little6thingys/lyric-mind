from openai import OpenAI

client = OpenAI(base_url="http://192.168.1.99:8000/v1", api_key="sk-local")

messages = [
	{"role": "system", "content": "You are a helpful assistant."},
	{"role": "user", "content": "Who won the 2018 World Cup?"},
]

# First message
resp = client.chat.completions.create(model="llama3", messages=messages)
print(resp.choices[0].message.content)

# Append user follow-up and resend
messages.append({"role": "assistant", "content": resp.choices[0].message.content})
messages.append({"role": "user", "content": "Where was the final played?"})

resp = client.chat.completions.create(model="llama3", messages=messages)
print(resp.choices[0].message.content)


for question in [
	"Who was the top scorer?",
	"Which team did France defeat in the semifinals?",
	"What was the score in that match?",
	"Who was France's captain?",
	"Which country hosted the next World Cup?",
]:
	messages.append({"role": "user", "content": question})
	resp = client.chat.completions.create(model="llama3", messages=messages)
	answer = resp.choices[0].message.content
	print(f"Q: {question}\nA: {answer}\n")
	messages.append({"role": "assistant", "content": answer})
