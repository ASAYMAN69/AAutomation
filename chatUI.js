import { generateSessionId, chatApi } from './chatFunction.js';

(function() {
  // UI Configuration (color scheme)
  const UIConfig = {
    // Default colors
    chatButtonColor: 'rgb(111, 90, 165)', 
    sendButtonColor: 'rgb(154, 134, 242)',
    
    // Helper function to lighten a color - defined first to avoid the error
    lightenColor: function(color, factor) {
      // Convert to RGB if it's a hex color
      let r, g, b;
      
      if (color.startsWith('#')) {
        const hex = color.replace('#', '');
        r = parseInt(hex.substr(0, 2), 16);
        g = parseInt(hex.substr(2, 2), 16);
        b = parseInt(hex.substr(4, 2), 16);
      } else if (color.startsWith('rgb')) {
        // Extract RGB values
        const rgbValues = color.match(/\d+/g);
        r = parseInt(rgbValues[0]);
        g = parseInt(rgbValues[1]);
        b = parseInt(rgbValues[2]);
      } else {
        // Default to a light blue if color format is unknown
        return `rgba(200, 240, 255, ${factor})`;
      }
      
      // Lighten the color
      r = Math.floor(r + (255 - r) * factor);
      g = Math.floor(g + (255 - g) * factor);
      b = Math.floor(b + (255 - b) * factor);
      
      return `rgb(${r}, ${g}, ${b})`;
    },
    
    // Set custom chat button color and update derived colors
    setChatButtonColor: function(color) {
      this.chatButtonColor = color;
      
      // Apply the new color to all relevant elements
      document.documentElement.style.setProperty('--chat-button-color', color);
      
      // Calculate a lighter version of the color for buttons hover
      const buttonHoverColor = this.lightenColor(color, 0.2);
      document.documentElement.style.setProperty('--button-hover-color', buttonHoverColor);
      
      // Calculate a lighter version for bot messages
      const botMessageColor = this.lightenColor(color, 0.85);
      document.documentElement.style.setProperty('--bot-message-color', botMessageColor);
    },
    
    // Set send button color
    setSendButtonColor: function(color) {
      this.sendButtonColor = color;
      document.documentElement.style.setProperty('--send-button-color', color);
    }
  };
  
  // Create the chat UI
  function createChatWidget() {
    // Create styles for the widget
    const style = document.createElement('style');
    style.textContent = `
      :root {
        --chat-button-color: ${UIConfig.chatButtonColor};
        --send-button-color: ${UIConfig.sendButtonColor};
        --bot-message-color: ${UIConfig.lightenColor(UIConfig.chatButtonColor, 0.85)};
        --button-hover-color: ${UIConfig.lightenColor(UIConfig.chatButtonColor, 0.2)};
      }
      
      #chat-widget-container {
        position: fixed;
        bottom: 20px;
        right: 20px;
        z-index: 9999;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
      }
      
      #chat-widget-button {
        width: 60px;
        height: 60px;
        border-radius: 50%;
        background-color: var(--chat-button-color);
        color: white;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
        transition: transform 0.2s;
      }
      
      #chat-widget-button:hover {
        transform: scale(1.05);
      }
      
      #chat-widget-button svg {
        width: 28px;
        height: 28px;
        transition: transform 0.3s ease, opacity 0.3s ease;
      }
      
      #chat-icon {
        opacity: 1;
        transform: rotate(0deg);
        transition: opacity 0.3s ease, transform 0.3s ease;
      }
      
      #arrow-icon {
        position: absolute;
        opacity: 0;
        transform: rotate(-90deg);
        transition: opacity 0.3s ease, transform 0.3s ease;
      }
      
      #chat-widget-button.open #chat-icon {
        opacity: 0;
        transform: rotate(90deg);
      }
      
      #chat-widget-button.open #arrow-icon {
        opacity: 1;
        transform: rotate(0deg);
      }
      
      #chat-widget-window {
        position: absolute;
        bottom: 80px;
        right: 0;
        width: 320px;
        height: 400px;
        background-color: white;
        border-radius: 10px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        display: flex;
        flex-direction: column;
        overflow: hidden;
        opacity: 0;
        transform: translateY(20px) scale(0.95);
        pointer-events: none;
        transition: opacity 0.3s ease, transform 0.3s ease;
      }
      
      #chat-widget-window.open {
        display: flex;
        opacity: 1;
        transform: translateY(0) scale(1);
        pointer-events: auto;
      }
      
      #chat-widget-header {
        background-color: var(--chat-button-color);
        color: white;
        padding: 12px 16px;
        display: flex;
        align-items: center;
        justify-content: space-between;
      }
      
      #chat-widget-title {
        font-weight: 600;
        font-size: 16px;
      }
      
      #chat-widget-close {
        cursor: pointer;
        background: none;
        border: none;
        color: white;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 0;
        width: 24px;
        height: 24px;
      }
      
      #chat-widget-messages {
        flex: 1;
        overflow-y: auto;
        padding: 16px;
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      
      .chat-message {
        max-width: 80%;
        padding: 10px 14px;
        border-radius: 18px;
        line-height: 1.4;
        font-size: 14px;
        word-wrap: break-word;
        animation: message-appear 0.3s cubic-bezier(0.18, 0.89, 0.32, 1.28);
        transform-origin: bottom center;
      }
      
      .chat-message.bot {
        align-self: flex-start;
        background-color: var(--bot-message-color);
        color: #333;
        border-bottom-left-radius: 4px;
        margin-bottom: 3px;
      }
      
      .chat-message.user {
        align-self: flex-end;
        background-color: var(--send-button-color);
        color: white;
        border-bottom-right-radius: 4px;
        margin-bottom: 3px;
        transform-origin: bottom right;
      }
      
      @keyframes message-appear {
        0% {
          opacity: 0;
          transform: translateY(20px) scale(0.8);
        }
        100% {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
      }
      
      @keyframes message-disappear {
        0% {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
        100% {
          opacity: 0;
          transform: translateY(20px) scale(0.8);
        }
      }
      
      .chat-image-container {
        align-self: flex-start;
        max-width: 80%;
        margin-bottom: 3px;
        animation: message-appear 0.3s cubic-bezier(0.18, 0.89, 0.32, 1.28);
      }
      
      #chat-widget-input-area {
        padding: 12px;
        border-top: 1px solid #eaeaea;
        display: flex;
        align-items: center;
        gap: 8px;
      }
      
      #chat-widget-input {
        flex: 1;
        padding: 10px 14px;
        border: 1px solid #ddd;
        border-radius: 20px;
        outline: none;
        font-size: 14px;
      }
      
      #chat-widget-input:focus {
        border-color: var(--chat-button-color);
      }
      
      #chat-widget-send {
        background-color: var(--send-button-color);
        color: white;
        border: none;
        width: 34px;
        height: 34px;
        border-radius: 50%;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      }
      
      #chat-widget-send svg {
        width: 18px;
        height: 18px;
      }
      
      .typing-indicator {
        display: flex;
        gap: 4px;
        padding: 8px 12px;
        background-color: var(--bot-message-color);
        border-radius: 18px;
        width: fit-content;
        align-self: flex-start;
        margin-bottom: 5px;
        opacity: 0;
        transform: translateY(20px);
        animation: typing-appear 0.3s cubic-bezier(0.18, 0.89, 0.32, 1.28) forwards;
      }
      
      .typing-indicator.hide {
        animation: typing-disappear 0.3s cubic-bezier(0.6, 0.04, 0.98, 0.34) forwards;
      }
      
      @keyframes typing-appear {
        0% {
          opacity: 0;
          transform: translateY(20px);
        }
        100% {
          opacity: 1;
          transform: translateY(0);
        }
      }
      
      @keyframes typing-disappear {
        0% {
          opacity: 1;
          transform: translateY(0);
        }
        100% {
          opacity: 0;
          transform: translateY(20px);
        }
      }
      
      .typing-indicator span {
        width: 6px;
        height: 6px;
        background-color: #888;
        border-radius: 50%;
        display: inline-block;
        animation: typingAnimation 1s infinite ease-in-out;
      }
      
      .typing-indicator span:nth-child(1) { animation-delay: 0s; }
      .typing-indicator span:nth-child(2) { animation-delay: 0.2s; }
      .typing-indicator span:nth-child(3) { animation-delay: 0.4s; }
      
      @keyframes typingAnimation {
        0% { transform: translateY(0); }
        50% { transform: translateY(-5px); }
        100% { transform: translateY(0); }
      }
      
      .chat-button-wrapper {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        margin-top: 8px;
      }
      
      .chat-inline-button {
        background-color: transparent;
        border: 1px solid var(--chat-button-color);
        border-radius: 16px;
        padding: 6px 12px;
        font-size: 12px;
        cursor: pointer;
        transition: background-color 0.2s, color 0.2s;
        color: #333;
      }
      
      .chat-inline-button:hover {
        background-color: var(--button-hover-color);
        color: #000;
      }
      
      .chat-image {
        max-width: 100%;
        max-height: 200px;
        border-radius: 8px;
      }
      
      /* Add new styles for restart confirmation dialog */
      .restart-confirmation {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%) scale(0.9);
        background: white;
        padding: 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        z-index: 10000;
        opacity: 0;
        pointer-events: none;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        width: 280px;
        text-align: center;
      }
      
      .restart-confirmation.show {
        opacity: 1;
        transform: translate(-50%, -50%) scale(1);
        pointer-events: auto;
      }
      
      .restart-confirmation .warning-icon {
        width: 48px;
        height: 48px;
        margin: 0 auto 16px;
      }
      
      .restart-confirmation .warning-icon svg {
        width: 100%;
        height: 100%;
      }
      
      .restart-confirmation .title {
        font-weight: 600;
        margin-bottom: 8px;
      }
      
      .restart-confirmation .message {
        color: #666;
        margin-bottom: 20px;
        font-size: 14px;
      }
      
      .restart-confirmation .buttons {
        display: flex;
        gap: 12px;
        justify-content: center;
      }
      
      .restart-confirmation button {
        padding: 8px 24px;
        border-radius: 6px;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s ease;
      }
      
      .restart-confirmation .yes-btn {
        background-color: var(--chat-button-color);
        color: white;
        border: none;
      }
      
      .restart-confirmation .yes-btn:hover {
        background-color: var(--button-hover-color);
      }
      
      .restart-confirmation .no-btn {
        background: transparent;
        border: 1px solid var(--chat-button-color);
        color: #333;
      }
      
      .restart-confirmation .no-btn:hover {
        background-color: var(--chat-button-color);
        color: white;
      }
      
      #chat-widget-restart {
        position: absolute;
        right: 48px; /* Increased spacing from close button */
        top: 12px;
        background: none;
        border: none;
        padding: 0;
        width: 24px;
        height: 24px;
        cursor: pointer;
        color: white;
        opacity: 0.7;
        transition: opacity 0.2s ease;
      }
      
      #chat-widget-restart:hover {
        opacity: 1;
      }
    `;
    
    document.head.appendChild(style);
    
    // Create confirmation dialog
    const confirmationDialog = document.createElement('div');
    confirmationDialog.className = 'restart-confirmation';
    confirmationDialog.innerHTML = `
      <div class="title">Restart Conversation?</div>
      <div class="message" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;">This will clear your current conversation and start a new one with a fresh session. This action cannot be undone.</div>
      <div class="buttons">
        <button class="yes-btn">Yes, restart</button>
        <button class="no-btn">No, keep chat</button>
      </div>
    `;
    document.body.appendChild(confirmationDialog);
    
    // Create the widget container
    const container = document.createElement('div');
    container.id = 'chat-widget-container';
    
    // Create the chat button
    const button = document.createElement('div');
    button.id = 'chat-widget-button';
    button.innerHTML = '<svg id="chat-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg><svg id="arrow-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>';
    
    // Create the chat window with updated restart icon
    const chatWindow = document.createElement('div');
    chatWindow.id = 'chat-widget-window';
    
    const header = document.createElement('div');
    header.id = 'chat-widget-header';
    
    const title = document.createElement('div');
    title.id = 'chat-widget-title';
    title.textContent = 'Chat Support';
    
    const restartButton = document.createElement('button');
    restartButton.id = 'chat-widget-restart';
    restartButton.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12c0-4.97 4.03-9 9-9 4.42 0 8.13 3.18 8.87 7.4"/><path d="M22 12c0 4.97-4.03 9-9 9-4.42 0-8.13-3.18-8.87-7.4"/><polyline points="16 5 20 9 16 13"/></svg>';
    
    const closeButton = document.createElement('button');
    closeButton.id = 'chat-widget-close';
    closeButton.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>';
    
    header.appendChild(title);
    header.appendChild(restartButton);
    header.appendChild(closeButton);
    
    // Create messages container
    const messagesContainer = document.createElement('div');
    messagesContainer.id = 'chat-widget-messages';
    
    // Create input area
    const inputArea = document.createElement('div');
    inputArea.id = 'chat-widget-input-area';
    
    const input = document.createElement('input');
    input.id = 'chat-widget-input';
    input.type = 'text';
    input.placeholder = 'Type a message...';
    
    const sendButton = document.createElement('button');
    sendButton.id = 'chat-widget-send';
    sendButton.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>';
    
    inputArea.appendChild(input);
    inputArea.appendChild(sendButton);
    
    // Assemble the chat window
    chatWindow.appendChild(header);
    chatWindow.appendChild(messagesContainer);
    chatWindow.appendChild(inputArea);
    
    // Add all elements to the container
    container.appendChild(chatWindow);
    container.appendChild(button);
    
    // Add the container to the body
    document.body.appendChild(container);
    
    // Apply initial colors
    UIConfig.setChatButtonColor(UIConfig.chatButtonColor);
    UIConfig.setSendButtonColor(UIConfig.sendButtonColor);
    
    // Test function to demonstrate changing colors (for development/testing)
    window.changeChatColors = function(chatColor, sendColor) {
      if (chatColor) UIConfig.setChatButtonColor(chatColor);
      if (sendColor) UIConfig.setSendButtonColor(sendColor);
    };
    
    // Add event listeners
    button.addEventListener('click', () => {
      chatWindow.classList.toggle('open');
      button.classList.toggle('open');
      
      // If opening the chat for the first time, show welcome message
      if (chatWindow.classList.contains('open')) {
        // If opening the chat for the first time, show welcome message
        if (messagesContainer.children.length === 0) {
          showTypingIndicator();
          
          setTimeout(() => {
            hideTypingIndicator();
            addMessage("Hello! How can I help you today?", 'bot');
          }, 1000);
        }
      }
    });
    
    closeButton.addEventListener('click', () => {
      chatWindow.classList.remove('open');
      button.classList.remove('open');
    });
    
    // Handle sending messages
    const handleSendMessage = async () => {
      const message = input.value.trim();
      if (!message) return;
      
      // Clear input
      input.value = '';
      
      // Add user message to chat with animation
      addMessage(message, 'user');
      
      // Show typing indicator with animation
      showTypingIndicator();
      
      // Send to API and get response
      const botResponse = await chatApi.sendMessage(message);
      
      // Process the response
      processAndDisplayBotResponse(botResponse);
    };
    
    sendButton.addEventListener('click', handleSendMessage);
    
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        handleSendMessage();
      }
    });
    
    // Process and display bot response with separate images and text
    function processAndDisplayBotResponse(text) {
      // Hide typing indicator with fade-out animation
      const typingIndicator = document.getElementById('typing-indicator');
      if (typingIndicator) {
        typingIndicator.classList.add('hide');
        setTimeout(() => {
          if (typingIndicator && typingIndicator.parentNode) {
            typingIndicator.parentNode.removeChild(typingIndicator);
          }
        }, 300); // Match the duration of the typing-disappear animation
      }
      
      // Check for postimg.cc image URLs
      const imageRegex = /https:\/\/i\.postimg\.cc\/\S+/g;
      const imageMatches = text.match(imageRegex);
      
      // Check for button markup
      const buttonRegex = /``(.*?)``/g;
      const buttonMatches = [...text.matchAll(buttonRegex)];
      
      // Clean text by removing button markers
      let cleanText = text.replace(/``.*?``/g, '');
      
      // If there are image URLs, remove them from the text as well
      if (imageMatches) {
        imageMatches.forEach(imgUrl => {
          cleanText = cleanText.replace(imgUrl, '');
        });
      }
      
      cleanText = cleanText.trim();
      
      let displaySequence = [];
      
      // Add images first (if any) to display sequence
      if (imageMatches && imageMatches.length > 0) {
        imageMatches.forEach(imageUrl => {
          displaySequence.push({
            type: 'image',
            content: imageUrl
          });
        });
      }
      
      // Add text content (with buttons if any) to display sequence
      if (cleanText || buttonMatches.length > 0) {
        displaySequence.push({
          type: 'text',
          content: cleanText,
          buttons: buttonMatches.map(match => match[1])
        });
      }
      
      // Display elements with appropriate timing
      let delay = 0;
      displaySequence.forEach((item, index) => {
        setTimeout(() => {
          if (item.type === 'image') {
            displayImage(item.content);
          } else if (item.type === 'text') {
            displayTextWithButtons(item.content, item.buttons);
          }
        }, delay);
        
        // Add a 500ms delay between image and text, but only if there's an image followed by text
        if (item.type === 'image' && index < displaySequence.length - 1 && displaySequence[index + 1].type === 'text') {
          delay += 500;
        }
        
        delay += 300; // Basic delay between items
      });
    }
    
    // Display image
    function displayImage(imageUrl) {
      const imageContainer = document.createElement('div');
      imageContainer.className = 'chat-image-container';
      
      const imageElement = document.createElement('img');
      imageElement.src = imageUrl;
      imageElement.alt = 'Chat image';
      imageElement.className = 'chat-image';
      imageElement.onerror = () => {
        imageElement.style.display = 'none';
        console.error('Failed to load image:', imageUrl);
      };
      
      imageContainer.appendChild(imageElement);
      messagesContainer.appendChild(imageContainer);
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
    
    // Display text with buttons
    function displayTextWithButtons(text, buttons) {
      if (!text && (!buttons || buttons.length === 0)) return;
      
      const messageElement = document.createElement('div');
      messageElement.classList.add('chat-message', 'bot');
      
      if (text) {
        const textNode = document.createElement('div');
        textNode.textContent = text;
        messageElement.appendChild(textNode);
      }
      
      // Add buttons if any
      if (buttons && buttons.length > 0) {
        const buttonWrapper = document.createElement('div');
        buttonWrapper.className = 'chat-button-wrapper';
        
        buttons.forEach(buttonText => {
          const button = document.createElement('button');
          button.className = 'chat-inline-button';
          button.textContent = buttonText;
          
          button.onclick = () => {
            input.value = buttonText;
            sendButton.click();
          };
          
          buttonWrapper.appendChild(button);
        });
        
        messageElement.appendChild(buttonWrapper);
      }
      
      messagesContainer.appendChild(messageElement);
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
    
    // Helper function for adding messages with animation
    function addMessage(text, sender) {
      const messageElement = document.createElement('div');
      messageElement.classList.add('chat-message', sender);
      messageElement.textContent = text;
      messagesContainer.appendChild(messageElement);
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
    
    function showTypingIndicator() {
      // Remove any existing typing indicator first
      hideTypingIndicator();
      
      const indicator = document.createElement('div');
      indicator.className = 'typing-indicator';
      indicator.innerHTML = '<span></span><span></span><span></span>';
      indicator.id = 'typing-indicator';
      messagesContainer.appendChild(indicator);
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
    
    function hideTypingIndicator() {
      const indicator = document.getElementById('typing-indicator');
      if (indicator) {
        indicator.classList.add('hide');
        setTimeout(() => {
          if (indicator && indicator.parentNode) {
            indicator.parentNode.removeChild(indicator);
          }
        }, 300);
      }
    }
    
    // Add restart conversation functionality
    restartButton.addEventListener('click', () => {
      confirmationDialog.classList.add('show');
      confirmationDialog.style.display = 'block';
    });
    
    const yesButton = confirmationDialog.querySelector('.yes-btn');
    const noButton = confirmationDialog.querySelector('.no-btn');
    
    yesButton.addEventListener('click', () => {
      // Generate new session ID
      sessionId = generateSessionId();
      // Clear messages
      const messagesContainer = document.getElementById('chat-widget-messages');
      messagesContainer.innerHTML = '';
      // Show welcome message
      showTypingIndicator();
      setTimeout(() => {
        hideTypingIndicator();
        addMessage("Hello! How can I help you today?", 'bot');
      }, 1000);
      // Hide confirmation
      confirmationDialog.classList.remove('show');
      setTimeout(() => {
        confirmationDialog.style.display = 'none';
      }, 300);
    });
    
    noButton.addEventListener('click', () => {
      confirmationDialog.classList.remove('show');
      setTimeout(() => {
        confirmationDialog.style.display = 'none';
      }, 300);
    });
  }

  // Initialize the chat widget
  createChatWidget();
})();
