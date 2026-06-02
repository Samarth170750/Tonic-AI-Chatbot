document.addEventListener('DOMContentLoaded', () => {
    const chatForm = document.getElementById('chat-form');
    const userInput = document.getElementById('user-input');
    const chatMessages = document.getElementById('chat-messages');
    const sendBtn = document.getElementById('send-btn');

    // Configure marked for Markdown parsing, including code highlighting integration
    marked.setOptions({
        highlight: function (code, lang) {
            const language = hljs.getLanguage(lang) ? lang : 'plaintext';
            return hljs.highlight(code, { language }).value;
        },
        breaks: true, // Convert \n to <br>
        gfm: true     // GitHub Flavored Markdown
    });

    // Auto-resize textarea to fit content
    userInput.addEventListener('input', function () {
        this.style.height = 'auto';
        this.style.height = (this.scrollHeight) + 'px';

        // Ensure max height is respected, will show scrollbar
        if (this.scrollHeight > 150) {
            this.style.overflowY = 'auto';
        } else {
            this.style.overflowY = 'hidden';
        }

        // Disable button if input is empty
        if (this.value.trim() === '') {
            sendBtn.disabled = true;
        } else {
            sendBtn.disabled = false;
        }
    });

    // Handle Enter to send, Shift+Enter for new line
    userInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (this.value.trim() !== '') {
                // Manually submit form
                chatForm.dispatchEvent(new Event('submit', { cancelable: true }));
            }
        }
    });

    // Initial button state
    sendBtn.disabled = true;

    // Handle form submission
    chatForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const message = userInput.value.trim();
        if (!message) return;

        // Reset input immediately for better UX
        userInput.value = '';
        userInput.style.height = 'auto';
        sendBtn.disabled = true;

        // Append user's message
        appendMessage('user', message);

        // Add loading indicator from Bot
        const loadingId = addLoadingIndicator();

        try {
            // Because we're served from Flask at '/', we can use relative URL '/api/chat'
            // No CORS needed!
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ prompt: message })
            });


            removeElement(loadingId);

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `Server responded with ${response.status}`);
            }

            const data = await response.json();
            console.log(data.response);
            // Append the actual bot response
            appendMessage('bot', data.response);

        } catch (error) {
            console.error('Error fetching chat response:', error);
            removeElement(loadingId);
            appendMessage('bot', `**Error:** \`${error.message}\`\n\nPlease check your server or API key and try again.`);
        }
    });

    /**
     * Appends a message to the chat interface
     * @param {string} sender - 'user' or 'bot'
     * @param {string} text - Message content (Markdown supported for bot)
     */
    function appendMessage(sender, text) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}-message`;

        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';

        if (sender === 'bot') {
            // Parse Markdown and sanitize HTML to prevent XSS
            const parsedHTML = marked.parse(text);
            contentDiv.innerHTML = DOMPurify.sanitize(parsedHTML);
        } else {
            // User message is plain text
            contentDiv.textContent = text;
        }

        messageDiv.appendChild(contentDiv);
        chatMessages.appendChild(messageDiv);
        scrollToBottom();
    }

    /**
     * Adds an animated typing indicator
     * @returns {string} ID of the loading element
     */
    function addLoadingIndicator() {
        const id = 'loading-' + Date.now();
        const wrapper = document.createElement('div');
        wrapper.className = 'message bot-message';
        wrapper.id = id;

        const indicatorDiv = document.createElement('div');
        indicatorDiv.className = 'typing-indicator';
        indicatorDiv.innerHTML = `
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
        `;

        wrapper.appendChild(indicatorDiv);
        chatMessages.appendChild(wrapper);
        scrollToBottom();

        return id;
    }

    function removeElement(id) {
        const el = document.getElementById(id);
        if (el) el.remove();
    }

    function scrollToBottom() {
        // Use smooth scroll behavior naturally handled by CSS when possible
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
});
