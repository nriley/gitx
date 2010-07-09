//
//  PBDetailController.m
//  GitX
//
//  Created by Pieter de Bie on 16-06-08.
//  Copyright 2008 __MyCompanyName__. All rights reserved.
//

#import "PBGitWindowController.h"
#import "PBGitHistoryController.h"
#import "PBGitCommitController.h"
#import "PBGitDefaults.h"
#import "Terminal.h"
#import "PBCloneRepsitoryToSheet.h"
#import "PBGitSidebarController.h"
#import "NSString_Truncate.h"

@implementation PBGitWindowController

@synthesize repository;
@synthesize viewController;
@synthesize contentController;
@synthesize sidebarController;
@synthesize historyController;

- (id)initWithRepository:(PBGitRepository*)theRepository displayDefault:(BOOL)displayDefault
{
	if (!(self = [self initWithWindowNibName:@"RepositoryWindow"]))
		return nil;

	self.repository = theRepository;

	return self;
}

- (void)windowWillClose:(NSNotification *)notification
{
	//NSLog(@"Window will close!");

	if (sidebarController)
		[sidebarController removeView];
}

- (BOOL)validateMenuItem:(NSMenuItem *)menuItem
{
	SEL action = [menuItem action];
	if (action == @selector(showCommitView:) || action == @selector(showHistoryView:)) {
		if (action == @selector(showCommitView:))
			[menuItem setState: contentController != historyController ? NSOnState : NSOffState];
		else if (action == @selector(showHistoryView:))
			[menuItem setState: contentController == historyController ? NSOnState : NSOffState];
		return ![repository isBareRepository];
	}
	return YES;
}

- (void) awakeFromNib
{
	[[self window] setDelegate:self];
	[[self window] setAutorecalculatesContentBorderThickness:NO forEdge:NSMinYEdge];
	[[self window] setContentBorderThickness:24.0f forEdge:NSMinYEdge];

	sidebarController = [[PBGitSidebarController alloc] initWithRepository:repository superController:self];
	[[sidebarController view] setFrame:[sourceSplitView bounds]];
	[sourceSplitView addSubview:[sidebarController view]];
	[sourceListControlsView addSubview:sidebarController.sourceListControlsView];

	[[statusField cell] setBackgroundStyle:NSBackgroundStyleRaised];
	[progressIndicator setUsesThreadedAnimation:YES];

	NSImage *finderImage = [[NSWorkspace sharedWorkspace] iconForFileType:NSFileTypeForHFSTypeCode(kFinderIcon)];
	[finderItem setImage:finderImage];

	NSImage *terminalImage = [[NSWorkspace sharedWorkspace] iconForFile:@"/Applications/Utilities/Terminal.app/"];
	[terminalItem setImage:terminalImage];

	[self showWindow:nil];
}

- (void) removeAllContentSubViews
{
	if ([contentSplitView subviews])
		while ([[contentSplitView subviews] count] > 0)
			[[[contentSplitView subviews] lastObject] removeFromSuperviewWithoutNeedingDisplay];
}

- (void) changeContentController:(PBViewController *)controller
{
	if (!controller || (contentController == controller))
		return;

	if (contentController)
		[contentController removeObserver:self forKeyPath:@"status"];

	[self removeAllContentSubViews];

	contentController = controller;
	
	[[contentController view] setFrame:[contentSplitView bounds]];
	[contentSplitView addSubview:[contentController view]];

	[self setNextResponder: contentController];
	[[self window] makeFirstResponder:[contentController firstResponder]];
	[contentController updateView];
	[contentController addObserver:self forKeyPath:@"status" options:NSKeyValueObservingOptionInitial context:@"statusChange"];
}

- (void) showCommitView:(id)sender
{
	[sidebarController selectStage];
}

- (void) showHistoryView:(id)sender
{
	[sidebarController selectCurrentBranch];
}

- (void)showMessageSheet:(NSString *)messageText infoText:(NSString *)infoText
{
    if ([PBGitDefaults truncateInfoText] && ([infoText length] > [PBGitDefaults truncateInfoTextSize])) {
        infoText = [infoText truncateToLength:[PBGitDefaults truncateInfoTextSize] mode:PBNSStringTruncateModeCenter indicator:@" ... "];
    }
	[[NSAlert alertWithMessageText:messageText
			 defaultButton:nil
		       alternateButton:nil
			   otherButton:nil
	     informativeTextWithFormat:infoText] beginSheetModalForWindow: [self window] modalDelegate:self didEndSelector:nil contextInfo:nil];
}

- (void)showErrorSheet:(NSError *)error
{
	[[NSAlert alertWithError:error] beginSheetModalForWindow: [self window] modalDelegate:self didEndSelector:nil contextInfo:nil];
}

- (void)windowDidBecomeMain:(NSNotification *)notification {
   /* Using ...didBecomeMain is better than ...didBecomeKey here because the QuickLook panel will count as key state change 
    and the outline view window will trigger a refresh in the middle of the QuickLook panel's closing animation which 
    causes a half second freeze with left over artifacts. */
   if (self.contentController && [PBGitDefaults refreshAutomatically]) {
		[self.contentController refresh:nil];
	}
}

- (void)showErrorSheetTitle:(NSString *)title message:(NSString *)message arguments:(NSArray *)arguments output:(NSString *)output
{
	NSString *command = [arguments componentsJoinedByString:@" "];
	NSString *reason = [NSString stringWithFormat:@"%@\n\ncommand: git %@\n%@", message, command, output];
	NSDictionary *userInfo = [NSDictionary dictionaryWithObjectsAndKeys:
							  title, NSLocalizedDescriptionKey,
							  reason, NSLocalizedRecoverySuggestionErrorKey,
							  nil];
	NSError *error = [NSError errorWithDomain:PBGitRepositoryErrorDomain code:0 userInfo:userInfo];
	[self showErrorSheet:error];
}

- (IBAction) revealInFinder:(id)sender
{
	[[NSWorkspace sharedWorkspace] openFile:[repository workingDirectory]];
}

- (IBAction) openInTerminal:(id)sender
{
	TerminalApplication *term = [SBApplication applicationWithBundleIdentifier: @"com.apple.Terminal"];
	NSString *workingDirectory = [[repository workingDirectory] stringByAppendingString:@"/"];
	NSString *cmd = [NSString stringWithFormat: @"cd \"%@\"; clear; echo '# Opened by GitX:'; git status", workingDirectory];
	[term doScript: cmd in: nil];
	[NSThread sleepForTimeInterval: 0.1];
	[term activate];
}

- (IBAction) cloneTo:(id)sender
{
	[PBCloneRepsitoryToSheet beginCloneRepsitoryToSheetForRepository:repository];
}

- (IBAction) refresh:(id)sender
{
	[contentController refresh:self];
}

- (void) updateStatus
{
	NSString *status = contentController.status;
	BOOL isBusy = contentController.isBusy;

	if (!status) {
		status = @"";
		isBusy = NO;
	}

	[statusField setStringValue:status];

	if (isBusy) {
		[progressIndicator startAnimation:self];
		[progressIndicator setHidden:NO];
	}
	else {
		[progressIndicator stopAnimation:self];
		[progressIndicator setHidden:YES];
	}
}

- (void) observeValueForKeyPath:(NSString *)keyPath ofObject:(id)object change:(NSDictionary *)change context:(void *)context
{
    if ([(NSString *)context isEqualToString:@"statusChange"]) {
		[self updateStatus];
		return;
	}

	[super observeValueForKeyPath:keyPath ofObject:object change:change context:context];
}



#pragma mark -
#pragma mark SplitView Delegates

#define kGitSplitViewMinWidth 100.0f
#define kGitSplitViewMaxWidth 300.0f

#pragma mark min/max widths while moving the divider

- (CGFloat)splitView:(NSSplitView *)view constrainMinCoordinate:(CGFloat)proposedMin ofSubviewAt:(NSInteger)dividerIndex
{
	if (proposedMin < kGitSplitViewMinWidth)
		return kGitSplitViewMinWidth;

	return proposedMin;
}

- (CGFloat)splitView:(NSSplitView *)view constrainMaxCoordinate:(CGFloat)proposedMax ofSubviewAt:(NSInteger)dividerIndex
{
	if (dividerIndex == 0)
		return kGitSplitViewMaxWidth;

	return proposedMax;
}

#pragma mark constrain sidebar width while resizing the window

- (void)splitView:(NSSplitView *)sender resizeSubviewsWithOldSize:(NSSize)oldSize
{
	NSRect newFrame = [sender frame];

	float dividerThickness = [sender dividerThickness];

	NSView *sourceView = [[sender subviews] objectAtIndex:0];
	NSRect sourceFrame = [sourceView frame];
	sourceFrame.size.height = newFrame.size.height;

	NSView *mainView = [[sender subviews] objectAtIndex:1];
	NSRect mainFrame = [mainView frame];
	mainFrame.origin.x = sourceFrame.size.width + dividerThickness;
	mainFrame.size.width = newFrame.size.width - mainFrame.origin.x;
	mainFrame.size.height = newFrame.size.height;

	[sourceView setFrame:sourceFrame];
	[mainView setFrame:mainFrame];
}

@end
