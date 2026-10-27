import React from 'react';
import type { ScrollView } from 'react-native';

// Registering screen scroll views lets tours auto-scroll to targets below the
// fold without hard-coding screen measurements.
export const manageScrollRef = React.createRef<ScrollView>();
export const profileScrollRef = React.createRef<ScrollView>();
export const issueScrollRef = React.createRef<ScrollView>();
export const postScrollRef = React.createRef<ScrollView>();
