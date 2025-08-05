const fs = require('fs');
const path = require('path');

const filePath = 'src/app/investors/investments/[id]/page.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// Define the new conditional fields section
const conditionalFieldsSection = `                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                        {/* Return Rate - Only for PREFERRED_RETURN */}
                        {tier.tierType === 'PREFERRED_RETURN' && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Return Rate (%)
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              value={tier.returnRate || ''}
                              onChange={(e) => updateWaterfallTier(index, 'returnRate', e.target.value ? parseFloat(e.target.value) : null)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              placeholder="8.0"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                              Annual preferred return rate (e.g., 8% = 8.0)
                            </p>
                          </div>
                        )}

                        {/* Catch-Up Percentage - Only for CATCH_UP */}
                        {tier.tierType === 'CATCH_UP' && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Catch-Up Percentage (%)
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              value={tier.catchUpPercentage || ''}
                              onChange={(e) => updateWaterfallTier(index, 'catchUpPercentage', e.target.value ? parseFloat(e.target.value) : null)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              placeholder="80.0"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                              Percentage of profits GP receives during catch-up (e.g., 80% = 80.0)
                            </p>
                          </div>
                        )}

                        {/* Promote Percentage - Only for PROMOTE */}
                        {tier.tierType === 'PROMOTE' && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Promote Percentage (%)
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              value={tier.promotePercentage || ''}
                              onChange={(e) => updateWaterfallTier(index, 'promotePercentage', e.target.value ? parseFloat(e.target.value) : null)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              placeholder="20.0"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                              GP's promote percentage of profits (e.g., 20% = 20.0)
                            </p>
                          </div>
                        )}

                        {/* No additional fields for RESIDUAL and RETURN_OF_CAPITAL */}
                        {(tier.tierType === 'RESIDUAL' || tier.tierType === 'RETURN_OF_CAPITAL') && (
                          <div className="col-span-3">
                            <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                              <p className="text-sm text-gray-600">
                                {tier.tierType === 'RESIDUAL' 
                                  ? 'Residual profits are split based on ownership percentages. No additional configuration needed.'
                                  : 'Return of capital distributes original invested amounts. No additional configuration needed.'
                                }
                              </p>
                            </div>
                          </div>
                        )}
                      </div>`;

// Define the old fields section to replace
const oldFieldsSection = `                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Return Rate (%)
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            value={tier.returnRate || ''}
                            onChange={(e) => updateWaterfallTier(index, 'returnRate', e.target.value ? parseFloat(e.target.value) : null)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="8.0"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Catch-Up Percentage (%)
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            value={tier.catchUpPercentage || ''}
                            onChange={(e) => updateWaterfallTier(index, 'catchUpPercentage', e.target.value ? parseFloat(e.target.value) : null)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="80.0"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Promote Percentage (%)
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            value={tier.promotePercentage || ''}
                            onChange={(e) => updateWaterfallTier(index, 'promotePercentage', e.target.value ? parseFloat(e.target.value) : null)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="20.0"
                          />
                        </div>
                      </div>`;

// Replace all occurrences
content = content.replace(new RegExp(oldFieldsSection.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), conditionalFieldsSection);

// Write the updated content back to the file
fs.writeFileSync(filePath, content, 'utf8');

console.log('Waterfall forms updated successfully!'); 