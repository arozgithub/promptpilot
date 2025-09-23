# A/B Testing Component Documentation

## Overview

The A/B Testing component provides an interface for comparing different variations of prompts or testing the same prompt across different AI models. This component is designed to help users optimize their prompts for better results by facilitating comparisons and evaluations.

## Key Features

### 1. Multi-Variant Testing

Create multiple variations of the same base prompt to find the most effective wording and structure.

- Generate 3-5 variations
- Each variation can use a different model from the Gemini family
- Automatically evaluates and ranks variations by effectiveness

### 2. Model Comparison

Test the same prompt across different AI models to see how each model responds.

- Compare primarily across the Gemini family of models
- Include optional non-Gemini models for reference
- Evaluate model differences in handling the same prompt

### 3. Separate Context Input

Provides separate input fields for:
- **Base Prompt**: The instructions or query pattern
- **User Context**: Specific data, information, or context to be processed by the prompt

This separation allows for reusing the same base prompt with different contexts or inputs.

### 4. Token and Cost Estimation

Built-in token estimator shows:
- Input token count (for base prompt + context)
- Estimated output token count
- Projected costs based on current model pricing
- Visual breakdown of token usage

## Usage

1. Select the testing type (Multi-Variant or Model Comparison)
2. Enter your base prompt (instructions)
3. Optionally add user context (data/information)
4. For Multi-Variant testing, select the number of variations
5. For Model Comparison, review the selected models
6. Generate results
7. Evaluate and compare the outputs
8. Save the best variation to the version control system

## Token Estimator

The Token Estimator helps users understand:
- Token counts for inputs and estimated outputs
- Cost projections for different models
- Comparative costs across models

This feature helps users make informed decisions about model selection and prompt optimization to manage costs effectively.

## API Integration

The component integrates with the `/api/ab-testing` endpoint which:
- Processes variation generation requests (POST)
- Handles evaluation requests (PUT)
- Supports base prompt and user context separation
- Simulates real model behavior for development purposes

## Best Practices

1. Keep the base prompt focused on the pattern/instructions
2. Use the user context field for specific information that changes between uses
3. Compare across at least 3 variations to find optimal wording
4. Review token estimates to optimize for cost efficiency
5. Save the best-performing variations to the version control system