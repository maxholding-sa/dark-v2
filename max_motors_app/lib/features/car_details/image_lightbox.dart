import 'package:flutter/material.dart';

import '../../core/theme/app_colors.dart';
import '../../core/widgets/app_network_image.dart';

/// Fullscreen swipeable image viewer for car galleries with premium
/// dot indicators and swipe-to-dismiss.
class ImageLightbox extends StatefulWidget {
  const ImageLightbox({super.key, required this.images, this.initialIndex = 0});

  final List<String> images;
  final int initialIndex;

  @override
  State<ImageLightbox> createState() => _ImageLightboxState();
}

class _ImageLightboxState extends State<ImageLightbox> {
  late final PageController _controller =
      PageController(initialPage: widget.initialIndex);
  late int _index = widget.initialIndex;
  double _dragOffset = 0;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      body: GestureDetector(
        onVerticalDragUpdate: (details) {
          setState(() => _dragOffset += details.delta.dy);
        },
        onVerticalDragEnd: (details) {
          if (_dragOffset.abs() > 100) {
            Navigator.of(context).pop();
          } else {
            setState(() => _dragOffset = 0);
          }
        },
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 200),
          color: Colors.black.withValues(
            alpha: (1 - (_dragOffset.abs() / 400)).clamp(0.3, 1.0),
          ),
          child: Transform.translate(
            offset: Offset(0, _dragOffset),
            child: Stack(
              children: [
                // ── PageView ──
                PageView.builder(
                  controller: _controller,
                  itemCount: widget.images.length,
                  onPageChanged: (i) => setState(() => _index = i),
                  itemBuilder: (_, i) => InteractiveViewer(
                    minScale: 1,
                    maxScale: 4,
                    child: Center(
                      child: AppNetworkImage(
                        url: widget.images[i],
                        fit: BoxFit.contain,
                      ),
                    ),
                  ),
                ),

                // ── Top bar ──
                Positioned(
                  top: 0,
                  left: 0,
                  right: 0,
                  child: SafeArea(
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          // Close button
                          GestureDetector(
                            onTap: () => Navigator.of(context).pop(),
                            child: Container(
                              width: 38,
                              height: 38,
                              decoration: BoxDecoration(
                                color: Colors.white.withValues(alpha: 0.1),
                                shape: BoxShape.circle,
                                border: Border.all(
                                  color: Colors.white.withValues(alpha: 0.15),
                                ),
                              ),
                              child: const Icon(
                                Icons.close_rounded,
                                color: Colors.white,
                                size: 20,
                              ),
                            ),
                          ),
                          // Counter
                          Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 12,
                              vertical: 6,
                            ),
                            decoration: BoxDecoration(
                              color: Colors.white.withValues(alpha: 0.1),
                              borderRadius: BorderRadius.circular(20),
                              border: Border.all(
                                color: Colors.white.withValues(alpha: 0.15),
                              ),
                            ),
                            child: Text(
                              '${_index + 1} / ${widget.images.length}',
                              style: const TextStyle(
                                color: Colors.white,
                                fontSize: 13,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),

                // ── Dot indicators ──
                if (widget.images.length > 1)
                  Positioned(
                    bottom: MediaQuery.of(context).padding.bottom + 20,
                    left: 0,
                    right: 0,
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: List.generate(widget.images.length, (i) {
                        final isActive = i == _index;
                        return AnimatedContainer(
                          duration: const Duration(milliseconds: 300),
                          curve: Curves.easeOutCubic,
                          width: isActive ? 20 : 6,
                          height: 6,
                          margin: const EdgeInsets.symmetric(horizontal: 3),
                          decoration: BoxDecoration(
                            borderRadius: BorderRadius.circular(3),
                            gradient: isActive
                                ? const LinearGradient(
                                    colors: AppColors.goldButtonGradient,
                                  )
                                : null,
                            color: isActive
                                ? null
                                : Colors.white.withValues(alpha: 0.3),
                            boxShadow: isActive
                                ? [
                                    BoxShadow(
                                      color: AppColors.goldGlow,
                                      blurRadius: 6,
                                      spreadRadius: 1,
                                    ),
                                  ]
                                : null,
                          ),
                        );
                      }),
                    ),
                  ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
