import React, { useState } from 'react';
import { QuestionType } from '../types';
import { questionTypesByCategory } from '../utils/defaults';

interface QuestionPaletteProps {
  onAddQuestion: (type: QuestionType) => void;
}

export function QuestionPalette({ onAddQuestion }: QuestionPaletteProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(Object.keys(questionTypesByCategory))
  );

  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  const handleDragStart = (e: React.DragEvent, type: QuestionType) => {
    e.dataTransfer.setData('questionType', type);
    e.dataTransfer.effectAllowed = 'copy';
  };

  const filteredCategories = Object.entries(questionTypesByCategory).reduce(
    (acc, [category, types]) => {
      const filtered = types.filter(
        t =>
          t.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
          t.type.toLowerCase().includes(searchTerm.toLowerCase())
      );
      if (filtered.length > 0) {
        acc[category] = filtered;
      }
      return acc;
    },
    {} as typeof questionTypesByCategory
  );

  return (
    <div className="question-palette">
      <div className="palette-header">
        <h3>🧩 Question Types</h3>
      </div>

      <div className="palette-search">
        <input
          type="text"
          placeholder="Search questions..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
      </div>

      <div className="palette-categories">
        {Object.entries(filteredCategories).map(([category, types]) => (
          <div key={category} className="palette-category">
            <div
              className="category-header"
              onClick={() => toggleCategory(category)}
            >
              <span className="category-toggle">
                {expandedCategories.has(category) ? '▼' : '▶'}
              </span>
              <span className="category-name">{category}</span>
              <span className="category-count">{types.length}</span>
            </div>

            {expandedCategories.has(category) && (
              <div className="category-items">
                {types.map((typeInfo) => (
                  <div
                    key={typeInfo.type}
                    className="question-type-item"
                    draggable
                    onDragStart={(e) => handleDragStart(e, typeInfo.type)}
                    onClick={() => onAddQuestion(typeInfo.type)}
                    title={`Add ${typeInfo.label}`}
                  >
                    <span className="question-type-icon">{typeInfo.icon}</span>
                    <span className="question-type-label">{typeInfo.label}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="palette-help">
        <p>💡 Drag & drop or click to add</p>
      </div>
    </div>
  );
}
